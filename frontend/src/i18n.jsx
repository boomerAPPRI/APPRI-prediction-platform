import React, { createContext, useContext, useState } from 'react';

const messages = {
  en: {
    appTitle: 'APPRI Prediction Platform',
    register: 'Register',
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    username: 'Username',
    password: 'Password',
    ageRange: 'Age Range',
    country: 'Country',
    occupation: 'Occupation',
    submit: 'Submit',
    balance: 'Token Balance',
    createQuestion: 'Create Question',
    questionTitle: 'Question Title',
    questionDescription: 'Description',
    questionType: 'Question Type',
    options: 'Options',
    addOption: 'Add Option',
    placeBet: 'Place Bet',
    amount: 'Amount',
    language: 'Language',
    yesNo: 'Yes / No',
    multipleChoice: 'Multiple Choice',
    multiSelect: 'Multiple Select',
    numeric: 'Numeric',
    date: 'Date',
    discussion: 'Discussion',
  },
  zh: {
    appTitle: 'APPRI 預測平台',
    register: '註冊',
    login: '登入',
    logout: '登出',
    email: '電子郵件',
    username: '用戶名稱',
    password: '密碼',
    ageRange: '年齡區間',
    country: '國家',
    occupation: '職業',
    submit: '送出',
    balance: '代幣餘額',
    createQuestion: '建立預測問題',
    questionTitle: '問題標題',
    questionDescription: '問題描述',
    questionType: '問題類型',
    options: '選項',
    addOption: '新增選項',
    placeBet: '下注',
    amount: '金額',
    language: '語言',
    yesNo: '是 / 否',
    multipleChoice: '單選題',
    multiSelect: '多選題',
    numeric: '數值題',
    date: '日期題',
    discussion: '討論',
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = (key) => messages[lang][key] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
