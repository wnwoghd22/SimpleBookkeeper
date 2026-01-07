import { loadFromLocalStorage, getTransactions } from './js/store.js';
import { initInputTab } from './js/tab-input.js';
import { initHistoryTab, initHistoryTab as refreshHistoryTab } from './js/tab-history.js'; // Hacky alias for now
import { initBalanceTab, updateSummary } from './js/tab-balance.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Data
    loadFromLocalStorage();

    // 2. Load Templates
    await loadTemplates();

    // 3. Initialize Tabs
    initInputTab();
    initHistoryTab();
    initBalanceTab();

    // 4. Setup Main Tab Switching
    setupMainNavigation();
});

async function loadTemplates() {
    const load = async (id, file) => {
        const response = await fetch(file);
        const text = await response.text();
        document.getElementById(id).innerHTML = text;
    };

    await Promise.all([
        load('tab-input', 'templates/input.html'),
        load('tab-history', 'templates/history.html'),
        load('tab-balance', 'templates/balance.html')
    ]);
}

function setupMainNavigation() {
    const tabBtns = document.querySelectorAll('.main-tab-btn');
    const tabContents = document.querySelectorAll('.main-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });

            // Activate clicked
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const content = document.getElementById(tabId);
            content.style.display = 'block';

            // Small delay for fade-in effect if CSS transition exists
            setTimeout(() => content.classList.add('active'), 10);

            // Logic to refresh data when entering tabs
            if (tabId === 'tab-balance') {
                updateSummary();
            } else if (tabId === 'tab-history') {
                // Re-init or generic refresh for history to pick up new transactions
                // Ideally export a specific refresh function.
                // For now, re-calling init is safe enough as it re-binds (careful of dupe listeners)
                // Actually, initHistoryTab adds listeners. We should separate init vs update.
                // BUT, for this rapid refactor, let's assume simple reload or standard render.
                // Implemented render() in initHistoryTab, so...
                // Better approach: Dispatch a custom event?
                document.getElementById('applyDateFilter').click(); // trigger render
            }
        });
    });
}
