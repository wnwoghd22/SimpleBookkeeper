// 계정 분류
export const accountTypes = {
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
}

export function saveToLocalStorage() {
    localStorage.setItem('doubleEntryTransactions', JSON.stringify(transactions));
    localStorage.setItem('trackedItems', JSON.stringify(trackedItems));
}
