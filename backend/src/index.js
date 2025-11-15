require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

const INITIAL_TOKENS = 1000;

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/** AUTH: Register */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password, ageRange, country, occupation } = req.body;

    if (!email || !username || !password || !ageRange || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, age_range, country, occupation, token_balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, email, username, token_balance`,
      [email, username, hashed, ageRange, country, occupation || null, INITIAL_TOKENS]
    );

    const user = result.rows[0];
    const token = createToken(user);
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Email or username already used' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

/** AUTH: Login */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = createToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        token_balance: user.token_balance,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Get current user */
app.get('/api/me', auth, async (req, res) => {
  const result = await db.query(
    'SELECT id, email, username, token_balance FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json(result.rows[0]);
});

/** Create question */
app.post('/api/questions', auth, async (req, res) => {
  try {
    const { type, titleEn, titleZh, descriptionEn, descriptionZh, options } = req.body;

    if (!type || !titleEn) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qRes = await db.query(
      `INSERT INTO questions
       (creator_id, type, title_en, title_zh, description_en, description_zh)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        req.user.id,
        type,
        titleEn,
        titleZh || null,
        descriptionEn || null,
        descriptionZh || null,
      ]
    );

    const question = qRes.rows[0];

    let optionRows = [];
    if (['YES_NO', 'MULTIPLE_CHOICE', 'MULTI_SELECT'].includes(type)) {
      let toInsert = options;
      if (type === 'YES_NO' && !options) {
        toInsert = [
          { labelEn: 'Yes', labelZh: '是' },
          { labelEn: 'No', labelZh: '否' },
        ];
      }
      if (toInsert && toInsert.length) {
        const values = [];
        const params = [];
        toInsert.forEach((opt, idx) => {
          params.push(question.id, opt.labelEn, opt.labelZh || null, idx);
          const base = (idx * 4) + 1;
          values.push(`($${base},$${base + 1},$${base + 2},$${base + 3})`);
        });

        const oRes = await db.query(
          `INSERT INTO question_options (question_id, label_en, label_zh, position)
           VALUES ${values.join(',')}
           RETURNING *`,
          params
        );
        optionRows = oRes.rows;
      }
    }

    res.json({ question, options: optionRows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

/** List questions */
app.get('/api/questions', async (req, res) => {
  const result = await db.query(
    `SELECT q.*, u.username as creator_username
     FROM questions q
     JOIN users u ON q.creator_id = u.id
     ORDER BY q.created_at DESC
     LIMIT 50`
  );
  res.json(result.rows);
});

/** Get question + options + pool stats */
app.get('/api/questions/:id', async (req, res) => {
  const { id } = req.params;

  const qRes = await db.query('SELECT * FROM questions WHERE id=$1', [id]);
  if (qRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const question = qRes.rows[0];
  const oRes = await db.query(
    `SELECT o.*,
            COALESCE(SUM(b.amount),0) AS total_stake
     FROM question_options o
     LEFT JOIN bets b ON b.option_id = o.id
     WHERE o.question_id=$1
     GROUP BY o.id
     ORDER BY o.position ASC`,
    [id]
  );
  const options = oRes.rows;

  const totalStake = options.reduce((sum, o) => sum + Number(o.total_stake || 0), 0);

  const optionsWithProb = options.map(o => ({
    ...o,
    probability: totalStake > 0 ? Number(o.total_stake) / totalStake : 0,
  }));

  res.json({
    question,
    options: optionsWithProb,
    totalStake,
  });
});

/** Place bet */
app.post('/api/questions/:id/bets', auth, async (req, res) => {
  const { id } = req.params;
  const { optionId, amount, numericValue, dateValue } = req.body;

  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    return res.status(400).json({ error: 'Amount must be a positive integer' });
  }

  try {
    const uRes = await db.query(
      'SELECT id, token_balance FROM users WHERE id=$1 FOR UPDATE',
      [req.user.id]
    );
    const user = uRes.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.token_balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const qRes = await db.query('SELECT * FROM questions WHERE id=$1', [id]);
    const question = qRes.rows[0];
    if (!question) return res.status(404).json({ error: 'Question not found' });

    if (['YES_NO', 'MULTIPLE_CHOICE', 'MULTI_SELECT'].includes(question.type) && !optionId) {
      return res.status(400).json({ error: 'optionId required for this question type' });
    }
    if (question.type === 'NUMERIC' && typeof numericValue !== 'number') {
      return res.status(400).json({ error: 'numericValue required' });
    }
    if (question.type === 'DATE' && !dateValue) {
      return res.status(400).json({ error: 'dateValue required' });
    }
    if (question.type === 'DISCUSSION') {
      return res.status(400).json({ error: 'Betting disabled on discussion questions' });
    }

    if (optionId) {
      const oRes = await db.query(
        'SELECT * FROM question_options WHERE id=$1 AND question_id=$2',
        [optionId, id]
      );
      if (oRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid option for this question' });
      }
    }

    await db.query('BEGIN');

    const betRes = await db.query(
      `INSERT INTO bets (user_id, question_id, option_id, numeric_value, date_value, amount)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        user.id,
        id,
        optionId || null,
        numericValue || null,
        dateValue || null,
        amount
      ]
    );

    await db.query(
      'UPDATE users SET token_balance = token_balance - $1 WHERE id=$2',
      [amount, user.id]
    );

    await db.query('COMMIT');

    res.json({ bet: betRes.rows[0] });
  } catch (e) {
    console.error(e);
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log('Backend listening on port', port);
});
