import { getTransactions, accountTypes, removeTransaction } from './store.js';
import { formatCurrency } from './utils.js';

// State for this tab
let currentView = 'journal';
let startDate = null;
let endDate = null;

export function initHistoryTab() {
    // Set default date range (1st of month to today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    // Check if elements exist (template might not be loaded yet if called too early, 
    // but app.js will handle order)
    const startDateInput = document.getElementById('historyStartDate');
    const endDateInput = document.getElementById('historyEndDate');

    // Format for date input: YYYY-MM-DD
    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    };

    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(firstDay);
        endDateInput.value = formatDate(today);

        startDate = startDateInput.value;
        endDate = endDateInput.value;
    }

    // Event Listeners
    const applyBtn = document.getElementById('applyDateFilter');
    if (applyBtn) applyBtn.addEventListener('click', applyDateFilter);

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            switchView(this.dataset.view);
        });
    });

    // Initial Render
    render();
}

function applyDateFilter() {
    startDate = document.getElementById('historyStartDate').value;
    endDate = document.getElementById('historyEndDate').value;
    render();
}

function switchView(viewName) {
    currentView = viewName;

    // Update Buttons
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.view-btn[data-view="${viewName}"]`).classList.add('active');

    // Update Content Visibility
    document.querySelectorAll('.history-view').forEach(div => div.style.display = 'none');
    document.getElementById(`view-${viewName}`).style.display = 'block';

    render();
}

function getFilteredTransactions() {
    const transactions = getTransactions();
    if (!startDate || !endDate) return transactions;

    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
}

function render() {
    const filtered = getFilteredTransactions();

    if (currentView === 'journal') {
        renderJournal(filtered);
    } else if (currentView === 'income-statement') {
        renderIncomeStatement(filtered);
    } else if (currentView === 'cash-flow') {
        renderCashFlow(filtered);
    }
}

// 1. Journal View Renderer
function renderJournal(transactions) {
    const tbody = document.getElementById('transactionBody');
    if (!tbody) return;

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">해당 기간에 거래가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td>${t.debitAccount}</td>
            <td class="amount-debit">${formatCurrency(t.debitAmount)}</td>
            <td>${t.creditAccount}</td>
            <td class="amount-credit">${formatCurrency(t.creditAmount)}</td>
            <td>
                <!-- Simple delete for now -->
                <button class="btn btn-danger btn-sm delete-btn" data-id="${t.id}">삭제</button>
            </td>
        </tr>
    `).join('');

    // Attach delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            if (confirm('정말 삭제하시겠습니까?')) {
                removeTransaction(this.dataset.id);
                render(); // Re-render this tab
            }
        });
    });
}

// 2. Income Statement Renderer
function renderIncomeStatement(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeDetails = {};
    const expenseDetails = {};

    transactions.forEach(t => {
        // Income (Credit side usually)
        if (accountTypes[t.creditAccount] === 'income') {
            totalIncome += t.creditAmount;
            incomeDetails[t.creditAccount] = (incomeDetails[t.creditAccount] || 0) + t.creditAmount;
        }
        // Expense (Debit side usually)
        if (accountTypes[t.debitAccount] === 'expense') {
            totalExpense += t.debitAmount;
            expenseDetails[t.debitAccount] = (expenseDetails[t.debitAccount] || 0) + t.debitAmount;
        }
    });

    const netIncome = totalIncome - totalExpense;

    document.getElementById('is-total-income').innerText = formatCurrency(totalIncome);
    document.getElementById('is-total-expense').innerText = formatCurrency(totalExpense);
    document.getElementById('is-net-income').innerText = formatCurrency(netIncome);

    // Render details
    renderDetailList('is-income-list', incomeDetails);
    renderDetailList('is-expense-list', expenseDetails);
}

// 3. Cash Flow Renderer (Simplified)
function renderCashFlow(transactions) {
    let totalInflow = 0;
    let totalOutflow = 0;
    const inflowDetails = {};
    const outflowDetails = {};

    // Define Liquid Assets
    const isLiquid = (account) => ['현금', '은행예금'].includes(account);

    transactions.forEach(t => {
        // Case 1: Debit Liquid (Inflow)
        if (isLiquid(t.debitAccount)) {
            // Source is Credit Account
            // Avoid internal transfer (Liquid -> Liquid)
            if (!isLiquid(t.creditAccount)) {
                totalInflow += t.debitAmount;
                const source = t.creditAccount;
                inflowDetails[source] = (inflowDetails[source] || 0) + t.debitAmount;
            }
        }

        // Case 2: Credit Liquid (Outflow)
        if (isLiquid(t.creditAccount)) {
            // Destination is Debit Account
            if (!isLiquid(t.debitAccount)) {
                totalOutflow += t.creditAmount;
                const dest = t.debitAccount;
                outflowDetails[dest] = (outflowDetails[dest] || 0) + t.creditAmount;
            }
        }
    });

    const netFlow = totalInflow - totalOutflow;

    document.getElementById('cf-total-inflow').innerText = formatCurrency(totalInflow);
    document.getElementById('cf-total-outflow').innerText = formatCurrency(totalOutflow);
    document.getElementById('cf-net-flow').innerText = formatCurrency(netFlow);

    renderDetailList('cf-inflow-list', inflowDetails);
    renderDetailList('cf-outflow-list', outflowDetails);
}

// Helper to render simple list of Account: Amount
function renderDetailList(elementId, dataObj) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const items = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);

    if (items.length === 0) {
        container.innerHTML = '<p class="empty-message">-</p>';
        return;
    }

    container.innerHTML = items.map(([name, amount]) => `
        <div class="bs-item">
            <span>${name}</span>
            <span class="amount">${formatCurrency(amount)}</span>
        </div>
    `).join('');
}
