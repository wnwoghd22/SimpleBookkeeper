// 기본 계정 분류 (삭제 불가)
const defaultAccountTypes = {
    '현금': 'asset',
    '은행예금': 'asset',
    '상각자산': 'asset',
    '재고': 'asset',
    '투자자산': 'asset',
    '식비': 'expense',
    '교통비': 'expense',
    '주거비': 'expense',
    '공과금': 'expense',
    '통신비': 'expense',
    '의료비': 'expense',
    '문화생활비': 'expense',
    '기타비용': 'expense',
    '잡손실': 'expense',
    '급여': 'income',
    '사업소득': 'income',
    '이자수입': 'income',
    '기타수입': 'income',
    '잡이익': 'income',
    '부채': 'liability'
};

// 사용자 정의 계정 (localStorage에서 로드)
let customAccounts = {};

// 병합된 계정 타입 (하위 호환성을 위해 export)
export const accountTypes = new Proxy({}, {
    get(target, prop) {
        return defaultAccountTypes[prop] || customAccounts[prop];
    },
    has(target, prop) {
        return prop in defaultAccountTypes || prop in customAccounts;
    },
    ownKeys() {
        return [...Object.keys(defaultAccountTypes), ...Object.keys(customAccounts)];
    },
    getOwnPropertyDescriptor(target, prop) {
        if (prop in defaultAccountTypes || prop in customAccounts) {
            return { enumerable: true, configurable: true };
        }
    }
});

// 계정 관련 함수들
export const getAccountTypes = () => ({ ...defaultAccountTypes, ...customAccounts });
export const getDefaultAccounts = () => ({ ...defaultAccountTypes });
export const getCustomAccounts = () => ({ ...customAccounts });

export const isDefaultAccount = (name) => name in defaultAccountTypes;

export const addCustomAccount = (name, type) => {
    if (name in defaultAccountTypes) {
        return { success: false, message: '기본 계정과 동일한 이름입니다.' };
    }
    if (name in customAccounts) {
        return { success: false, message: '이미 존재하는 계정입니다.' };
    }
    if (!['expense', 'income'].includes(type)) {
        return { success: false, message: '비용 또는 수입 계정만 추가할 수 있습니다.' };
    }
    customAccounts[name] = type;
    saveToLocalStorage();
    return { success: true };
};

export const removeCustomAccount = (name) => {
    if (name in defaultAccountTypes) {
        return { success: false, message: '기본 계정은 삭제할 수 없습니다.' };
    }
    if (!(name in customAccounts)) {
        return { success: false, message: '존재하지 않는 계정입니다.' };
    }
    delete customAccounts[name];
    saveToLocalStorage();
    return { success: true };
};

// State
let transactions = [];
let trackedItems = [];

// Getters
export const getTransactions = () => transactions;
export const getTrackedItems = () => trackedItems;

// Setters (Direct mutation for simplicity in this refactor, but wrapped)
export const setTransactions = (newTransactions) => { transactions = newTransactions; };
export const setTrackedItems = (newItems) => { trackedItems = newItems; };

// Methods to modify state
export const addTransaction = (transaction) => {
    transactions.push(transaction);
    sortTransactions();
    saveToLocalStorage();
};

export const updateTransaction = (id, updatedTransaction) => {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index] = updatedTransaction;
        sortTransactions();
        saveToLocalStorage();
    }
};

export const removeTransaction = (id) => {
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
};

export const addTrackedItem = (item) => {
    trackedItems.push(item);
    saveToLocalStorage();
};

export const updateTrackedItem = (id, updates) => {
    const item = trackedItems.find(i => i.id === id);
    if (item) {
        Object.assign(item, updates);
        saveToLocalStorage();
    }
};

function sortTransactions() {
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Persistence
export function loadFromLocalStorage() {
    const stored = localStorage.getItem('doubleEntryTransactions');
    if (stored) {
        transactions = JSON.parse(stored);
    }
    const storedItems = localStorage.getItem('trackedItems');
    if (storedItems) {
        trackedItems = JSON.parse(storedItems);
    }
    const storedCustomAccounts = localStorage.getItem('customAccounts');
    if (storedCustomAccounts) {
        customAccounts = JSON.parse(storedCustomAccounts);
    }
}

export function saveToLocalStorage() {
    localStorage.setItem('doubleEntryTransactions', JSON.stringify(transactions));
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
    localStorage.setItem('customAccounts', JSON.stringify(customAccounts));
}
