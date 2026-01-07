import { getTransactions, accountTypes } from './store.js';
import { formatCurrency } from './utils.js';

export function initBalanceTab() {
    // Initial render
    updateSummary();
}

// 요약 정보 업데이트 (재무상태표 로직)
export function updateSummary() {
    const transactions = getTransactions();
    const accountBalances = {};
    let totalIncome = 0;
    let totalExpense = 0;

    // 1. 모든 계정 잔액 및 수익/비용 계산
    transactions.forEach(t => {
        // 차변
        if (!accountBalances[t.debitAccount]) accountBalances[t.debitAccount] = 0;
        accountBalances[t.debitAccount] += t.debitAmount;

        if (accountTypes[t.debitAccount] === 'expense') {
            totalExpense += t.debitAmount;
        }

        // 대변
        if (!accountBalances[t.creditAccount]) accountBalances[t.creditAccount] = 0;
        accountBalances[t.creditAccount] -= t.creditAmount;

        if (accountTypes[t.creditAccount] === 'income') {
            totalIncome += t.creditAmount;
        }
    });

    // 2. 자산, 부채 분류
    const assets = [];
    const liabilities = [];

    for (const [account, balance] of Object.entries(accountBalances)) {
        if (balance === 0) continue;

        const type = accountTypes[account];
        if (type === 'asset') {
            assets.push({ name: account, amount: balance });
        } else if (type === 'liability') {
            liabilities.push({ name: account, amount: Math.abs(balance) });
        }
    }

    // 3. 순자산 (자본) 계산
    const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
    const netAssets = totalAssets - totalLiabilities;

    // 4. DOM 렌더링
    const assetsList = document.getElementById('bs-assets-list');
    const liabilitiesList = document.getElementById('bs-liabilities-list');
    const equityList = document.getElementById('bs-equity-list');

    // 자산
    if (assets.length > 0) {
        assetsList.innerHTML = assets.map(item => `
            <div class="bs-item">
                <span>${item.name}</span>
                <span class="amount">${formatCurrency(item.amount)}</span>
            </div>
        `).join('');
    } else {
        assetsList.innerHTML = '<p class="empty-message" style="color: #999; font-style: italic;">자산이 없습니다.</p>';
    }

    // 부채
    if (liabilities.length > 0) {
        liabilitiesList.innerHTML = liabilities.map(item => `
            <div class="bs-item">
                <span>${item.name}</span>
                <span class="amount">${formatCurrency(item.amount)}</span>
            </div>
        `).join('');
    } else {
        liabilitiesList.innerHTML = '<p class="empty-message" style="color: #999; font-style: italic;">부채가 없습니다.</p>';
    }

    // 순자산 (User requested "진짜 내 돈")
    equityList.innerHTML = `
        <div class="bs-item">
            <span>진짜 내 돈</span>
            <span class="amount ${netAssets < 0 ? 'negative-amount' : ''}">${formatCurrency(netAssets)}</span>
        </div>
    `;

    // 5. 합계 업데이트
    document.getElementById('bs-total-assets').innerText = formatCurrency(totalAssets);
    document.getElementById('bs-total-liabilities').innerText = formatCurrency(totalLiabilities);
    document.getElementById('bs-total-equity').innerText = formatCurrency(netAssets);

    const totalLiabilitiesEquity = totalLiabilities + netAssets;
    document.getElementById('bs-total-liabilities-equity').innerText = formatCurrency(totalLiabilitiesEquity);
}
