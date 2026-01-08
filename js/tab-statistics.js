import { getTransactions, accountTypes } from './store.js';
import { formatCurrency } from './utils.js';

// State
let currentPeriodType = 'monthly';
let startDate = null;
let endDate = null;
let netAssetsChartInstance = null;
let incomeExpenseChartInstance = null;

export function initStatisticsTab() {
    // 기본 날짜 범위 설정 (최근 1년)
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const startDateInput = document.getElementById('statsStartDate');
    const endDateInput = document.getElementById('statsEndDate');

    if (startDateInput && endDateInput) {
        startDateInput.value = formatDateForInput(oneYearAgo);
        endDateInput.value = formatDateForInput(today);

        startDate = startDateInput.value;
        endDate = endDateInput.value;
    }

    // 이벤트 리스너 등록
    setupEventListeners();

    // 초기 렌더링
    render();
}

function setupEventListeners() {
    // 기간 유형 선택 (월별/연별)
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b =>
                b.classList.remove('active'));
            this.classList.add('active');

            currentPeriodType = this.dataset.period;
            render();
        });
    });

    // 날짜 필터 적용
    const applyBtn = document.getElementById('applyStatsFilter');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            startDate = document.getElementById('statsStartDate').value;
            endDate = document.getElementById('statsEndDate').value;
            render();
        });
    }
}

function render() {
    // 1. 필터링된 거래 가져오기
    const filtered = getFilteredTransactions();

    // 데이터가 없으면 빈 차트 표시
    if (filtered.length === 0) {
        renderEmptyCharts();
        return;
    }

    // 2. 기간별 그룹화
    const grouped = groupByPeriod(filtered, currentPeriodType);

    // 3. 순자산 데이터 계산
    const netAssetsData = calculateNetAssetsByPeriod(grouped);

    // 4. 수입/지출 데이터 계산
    const incomeExpenseData = calculateIncomeExpenseByPeriod(grouped);

    // 5. 차트 렌더링
    renderNetAssetsChart(netAssetsData);
    renderIncomeExpenseChart(incomeExpenseData);
}

function getFilteredTransactions() {
    const transactions = getTransactions();
    if (!startDate || !endDate) return transactions;

    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
}

function groupByPeriod(transactions, periodType) {
    const grouped = {};

    transactions.forEach(t => {
        let key;
        if (periodType === 'monthly') {
            // '2024-01-15' -> '2024-01'
            key = t.date.substring(0, 7);
        } else {
            // '2024-01-15' -> '2024'
            key = t.date.substring(0, 4);
        }

        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(t);
    });

    return grouped;
}

function calculateNetAssetsByPeriod(groupedTransactions) {
    const periods = Object.keys(groupedTransactions).sort();
    const result = [];

    // 전체 거래를 시간순으로 순회하며 누적 계산
    let cumulativeAccountBalances = {};

    periods.forEach(period => {
        const transactions = groupedTransactions[period];

        // 해당 기간까지의 모든 거래로 잔액 계산
        transactions.forEach(t => {
            // 차변 (자산 증가)
            if (!cumulativeAccountBalances[t.debitAccount]) {
                cumulativeAccountBalances[t.debitAccount] = 0;
            }
            cumulativeAccountBalances[t.debitAccount] += t.debitAmount;

            // 대변 (자산 감소)
            if (!cumulativeAccountBalances[t.creditAccount]) {
                cumulativeAccountBalances[t.creditAccount] = 0;
            }
            cumulativeAccountBalances[t.creditAccount] -= t.creditAmount;
        });

        // 순자산 = 자산 - 부채
        let totalAssets = 0;
        let totalLiabilities = 0;

        for (const [account, balance] of Object.entries(cumulativeAccountBalances)) {
            const type = accountTypes[account];
            if (type === 'asset' && balance > 0) {
                totalAssets += balance;
            } else if (type === 'liability' && balance < 0) {
                totalLiabilities += Math.abs(balance);
            }
        }

        const netAssets = totalAssets - totalLiabilities;

        result.push({
            period: period,
            netAssets: netAssets
        });
    });

    return result;
}

function calculateIncomeExpenseByPeriod(groupedTransactions) {
    const periods = Object.keys(groupedTransactions).sort();
    const result = [];

    periods.forEach(period => {
        const transactions = groupedTransactions[period];
        let periodIncome = 0;
        let periodExpense = 0;

        transactions.forEach(t => {
            // 수입: 대변에 income 계정
            if (accountTypes[t.creditAccount] === 'income') {
                periodIncome += t.creditAmount;
            }

            // 지출: 차변에 expense 계정
            if (accountTypes[t.debitAccount] === 'expense') {
                periodExpense += t.debitAmount;
            }
        });

        result.push({
            period: period,
            income: periodIncome,
            expense: periodExpense
        });
    });

    return result;
}

function renderNetAssetsChart(data) {
    const ctx = document.getElementById('netAssetsChart');
    if (!ctx) return;

    // 기존 차트 파괴 (재렌더링 시)
    if (netAssetsChartInstance) {
        netAssetsChartInstance.destroy();
    }

    const labels = data.map(d => d.period);
    const values = data.map(d => d.netAssets);

    netAssetsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '순자산',
                data: values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '순자산: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function renderIncomeExpenseChart(data) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    if (incomeExpenseChartInstance) {
        incomeExpenseChartInstance.destroy();
    }

    const labels = data.map(d => d.period);
    const incomeValues = data.map(d => d.income);
    const expenseValues = data.map(d => d.expense);

    incomeExpenseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '수입',
                    data: incomeValues,
                    backgroundColor: 'rgba(39, 174, 96, 0.6)',
                    borderColor: '#27ae60',
                    borderWidth: 1
                },
                {
                    label: '지출',
                    data: expenseValues,
                    backgroundColor: 'rgba(231, 76, 60, 0.6)',
                    borderColor: '#e74c3c',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function renderEmptyCharts() {
    const netCtx = document.getElementById('netAssetsChart');
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart');

    if (netAssetsChartInstance) {
        netAssetsChartInstance.destroy();
    }
    if (incomeExpenseChartInstance) {
        incomeExpenseChartInstance.destroy();
    }

    // 빈 차트 표시
    if (netCtx) {
        netAssetsChartInstance = new Chart(netCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '순자산',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    }

    if (incomeExpenseCtx) {
        incomeExpenseChartInstance = new Chart(incomeExpenseCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    { label: '수입', data: [], backgroundColor: 'rgba(39, 174, 96, 0.6)' },
                    { label: '지출', data: [], backgroundColor: 'rgba(231, 76, 60, 0.6)' }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                }
            }
        });
    }
}

function formatDateForInput(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}
