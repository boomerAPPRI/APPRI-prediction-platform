import React, { useEffect, useState } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { api } from './api';
import './index.css';

function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-toggle">
      {t('language')}:
      <button onClick={() => setLang('en')} disabled={lang === 'en'}>
        English
      </button>
      <button onClick={() => setLang('zh')} disabled={lang === 'zh'}>
        繁體中文
      </button>
    </div>
  );
}

function AuthSection({ user, setUser }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    ageRange: '18-24',
    country: 'Taiwan',
    occupation: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const doRegister = async () => {
    setError('');
    try {
      const res = await api.register({
        email: form.email,
        username: form.username,
        password: form.password,
        ageRange: form.ageRange,
        country: form.country,
        occupation: form.occupation,
      });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
    } catch (e) {
      setError(e.response?.data?.error || 'Error');
    }
  };

  const doLogin = async () => {
    setError('');
    try {
      const res = await api.login({
        email: form.email,
        password: form.password,
      });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
    } catch (e) {
      setError(e.response?.data?.error || 'Error');
    }
  };

  if (user) {
    return (
      <div className="auth-logged-in">
        <div>
          {user.username} — {t('balance')}: {user.token_balance} APPRI
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            setUser(null);
          }}
        >
          {t('logout')}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-box">
      <div className="auth-tabs">
        <button onClick={() => setMode('login')}>{t('login')}</button>
        <button onClick={() => setMode('register')}>{t('register')}</button>
      </div>
      {mode === 'register' && (
        <div>
          <div>{t('email')}</div>
          <input name="email" value={form.email} onChange={handleChange} />
          <div>{t('username')}</div>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
          />
          <div>{t('password')}</div>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          <div>{t('ageRange')}</div>
          <select name="ageRange" value={form.ageRange} onChange={handleChange}>
            <option>18-24</option>
            <option>25-34</option>
            <option>35-44</option>
            <option>45-54</option>
            <option>55+</option>
          </select>
          <div>{t('country')}</div>
          <select name="country" value={form.country} onChange={handleChange}>
            <option>Taiwan</option>
            <option>United States</option>
            <option>Japan</option>
            <option>Other</option>
          </select>
          <div>{t('occupation')}</div>
          <input
            name="occupation"
            value={form.occupation}
            onChange={handleChange}
          />
          {error && <div className="error">{error}</div>}
          <button onClick={doRegister}>{t('register')}</button>
        </div>
      )}
      {mode === 'login' && (
        <div>
          <div>{t('email')}</div>
          <input name="email" value={form.email} onChange={handleChange} />
          <div>{t('password')}</div>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          {error && <div className="error">{error}</div>}
          <button onClick={doLogin}>{t('login')}</button>
        </div>
      )}
    </div>
  );
}

function QuestionForm({ onCreated }) {
  const { t } = useI18n();
  const [type, setType] = useState('YES_NO');
  const [titleEn, setTitleEn] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionZh, setDescriptionZh] = useState('');
  const [options, setOptions] = useState([{ labelEn: '', labelZh: '' }]);
  const [error, setError] = useState('');

  const addOption = () =>
    setOptions([...options, { labelEn: '', labelZh: '' }]);
  const updateOption = (index, field, value) => {
    const copy = [...options];
    copy[index][field] = value;
    setOptions(copy);
  };

  const submit = async () => {
    setError('');
    try {
      const payload = {
        type,
        titleEn,
        titleZh,
        descriptionEn,
        descriptionZh,
      };
      if (['YES_NO', 'MULTIPLE_CHOICE', 'MULTI_SELECT'].includes(type)) {
        payload.options = options.filter((o) => o.labelEn.trim() !== '');
      }
      const res = await api.createQuestion(payload);
      onCreated(res.data.question);
      setTitleEn('');
      setTitleZh('');
      setDescriptionEn('');
      setDescriptionZh('');
      setOptions([{ labelEn: '', labelZh: '' }]);
    } catch (e) {
      setError(e.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="question-form">
      <h3>{t('createQuestion')}</h3>
      <div>{t('questionType')}</div>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="YES_NO">{t('yesNo')}</option>
        <option value="MULTIPLE_CHOICE">{t('multipleChoice')}</option>
        <option value="MULTI_SELECT">{t('multiSelect')}</option>
        <option value="NUMERIC">{t('numeric')}</option>
        <option value="DATE">{t('date')}</option>
        <option value="DISCUSSION">{t('discussion')}</option>
      </select>

      <div>{t('questionTitle')} (EN)</div>
      <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
      <div>{t('questionTitle')} (繁體)</div>
      <input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} />
      <div>{t('questionDescription')} (EN)</div>
      <textarea
        value={descriptionEn}
        onChange={(e) => setDescriptionEn(e.target.value)}
      />
      <div>{t('questionDescription')} (繁體)</div>
      <textarea
        value={descriptionZh}
        onChange={(e) => setDescriptionZh(e.target.value)}
      />

      {['YES_NO', 'MULTIPLE_CHOICE', 'MULTI_SELECT'].includes(type) && (
        <div>
          <div>{t('options')}</div>
          {options.map((opt, idx) => (
            <div key={idx} className="option-row">
              <input
                placeholder="EN"
                value={opt.labelEn}
                onChange={(e) =>
                  updateOption(idx, 'labelEn', e.target.value)
                }
              />
              <input
                placeholder="繁體"
                value={opt.labelZh}
                onChange={(e) =>
                  updateOption(idx, 'labelZh', e.target.value)
                }
              />
            </div>
          ))}
          <button onClick={addOption}>{t('addOption')}</button>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      <button onClick={submit}>{t('submit')}</button>
    </div>
  );
}

function QuestionList({ onSelect }) {
  const [questions, setQuestions] = useState([]);
  const { lang } = useI18n();

  useEffect(() => {
    api.listQuestions().then((res) => setQuestions(res.data));
  }, []);

  return (
    <div>
      {questions.map((q) => (
        <div
          key={q.id}
          className="question-list-item"
          onClick={() => onSelect(q.id)}
        >
          <strong>{lang === 'zh' ? q.title_zh || q.title_en : q.title_en}</strong>
          <div className="question-type">{q.type}</div>
        </div>
      ))}
    </div>
  );
}

function QuestionDetail({ id, user, refreshUser }) {
  const { lang, t } = useI18n();
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState(10);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [dateValue, setDateValue] = useState('');

  useEffect(() => {
    if (!id) return;
    api.getQuestion(id).then((res) => {
      setData(res.data);
      setSelectedOption(null);
    });
  }, [id]);

  if (!id) return null;
  if (!data) return <div>Loading...</div>;

  const q = data.question;
  const options = data.options || [];
  const canBet = user && q.type !== 'DISCUSSION';

  const placeBet = async () => {
    if (!canBet) {
      setError('Login required or betting disabled');
      return;
    }
    setError('');
    try {
      const payload = { amount: Number(amount) };
      if (['YES_NO', 'MULTIPLE_CHOICE', 'MULTI_SELECT'].includes(q.type)) {
        payload.optionId = Number(selectedOption);
      }
      if (q.type === 'NUMERIC') {
        payload.numericValue = Number(numericValue);
      }
      if (q.type === 'DATE') {
        payload.dateValue = dateValue;
      }
      await api.placeBet(q.id, payload);
      await refreshUser();
      const res = await api.getQuestion(id);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="question-detail">
      <h3>{lang === 'zh' ? q.title_zh || q.title_en : q.title_en}</h3>
      <p>
        {lang === 'zh'
          ? q.description_zh || q.description_en
          : q.description_en}
      </p>
      <div>Type: {q.type}</div>

      {options.length > 0 && (
        <div>
          <h4>Options</h4>
          {options.map((o) => (
            <div key={o.id}>
              <label>
                {q.type === 'MULTI_SELECT' ? (
                  <input type="checkbox" disabled />
                ) : (
                  <input
                    type="radio"
                    name="option"
                    value={o.id}
                    checked={String(selectedOption) === String(o.id)}
                    onChange={(e) => setSelectedOption(e.target.value)}
                  />
                )}
                {lang === 'zh' ? o.label_zh || o.label_en : o.label_en}{' '}
                — stake {o.total_stake} tokens — prob:{' '}
                {(o.probability * 100).toFixed(1)}%
              </label>
            </div>
          ))}
        </div>
      )}

      {q.type === 'NUMERIC' && (
        <div>
          <div>Numeric prediction</div>
          <input
            type="number"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
          />
        </div>
      )}

      {q.type === 'DATE' && (
        <div>
          <div>Date prediction</div>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        </div>
      )}

      {canBet && (
        <div>
          <div>{t('amount')} (APPRI)</div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {error && <div className="error">{error}</div>}
          <button onClick={placeBet}>{t('placeBet')}</button>
        </div>
      )}
      {!user && <div>Please login to bet.</div>}
    </div>
  );
}

function RootApp() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  const refreshUser = async () => {
    try {
      const res = await api.me();
      setUser(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (localStorage.getItem('token')) {
      refreshUser();
    }
  }, []);

  return (
    <div className="root">
      <h2>{t('appTitle')}</h2>
      <LanguageToggle />
      <AuthSection user={user} setUser={setUser} />
      {user && <QuestionForm onCreated={() => {}} />}
      <div className="main-layout">
        <div className="left">
          <QuestionList onSelect={setSelectedQuestionId} />
        </div>
        <div className="right">
          <QuestionDetail
            id={selectedQuestionId}
            user={user}
            refreshUser={refreshUser}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <RootApp />
    </I18nProvider>
  );
}
