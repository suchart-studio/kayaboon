import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let allTransactions = [];
let chartInstance = null;

// Element References
const filterYear = document.getElementById('filterYear');
const filterMonth = document.getElementById('filterMonth');
const filterCommunity = document.getElementById('filterCommunity');
const tableBody = document.getElementById('transactionTable');

// ฟังก์ชันโหลดข้อมูล
async function loadTransactions() {
    tableBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูลรายงาน...</td></tr>';
    try {
        // ดึงข้อมูลทั้งหมดมาไว้ในหน่วยความจำเพื่อความรวดเร็วในการ Filter
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        allTransactions = [];
        querySnapshot.forEach((doc) => {
            allTransactions.push({ id: doc.id, ...doc.data() });
        });
        
        applyFilters();
    } catch (error) {
        console.error("Error loading transactions:", error);
        tableBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

// ฟังก์ชันประมวลผลการกรองข้อมูล
function applyFilters() {
    const fYear = filterYear.value;
    const fMonth = filterMonth.value;
    const fComm = filterCommunity.value.trim().toLowerCase();

    const filtered = allTransactions.filter(t => {
        const dateObj = new Date(t.timestamp);
        const tYear = dateObj.getFullYear().toString();
        // เดือนใน JS เริ่มที่ 0 เลยต้อง +1 และ pad ให้เป็น 2 หลัก
        const tMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const tComm = (t.community || '').toLowerCase();

        const matchYear = (fYear === 'all') || (tYear === fYear);
        const matchMonth = (fMonth === 'all') || (tMonth === fMonth);
        const matchComm = (fComm === '') || tComm.includes(fComm);

        return matchYear && matchMonth && matchComm;
    });

    updateDashboard(filtered);
}

// ฟังก์ชันอัพเดตหน้าจอ (ตัวเลข, ตาราง, กราฟ)
function updateDashboard(data) {
    let sumTotal = 0, sumGlass = 0, sumPaper = 0, sumPlastic = 0, sumMetal = 0, sumOther = 0;
    let tableHTML = '';

    if (data.length === 0) {
        tableHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>';
    } else {
        data.forEach(t => {
            // รวมยอด
            sumTotal += parseFloat(t.totalIncome || 0);
            sumGlass += parseFloat(t.trashGlass || 0);
            sumPaper += parseFloat(t.trashPaper || 0);
            sumPlastic += parseFloat(t.trashPlastic || 0);
            sumMetal += parseFloat(t.trashMetal || 0);
            sumOther += parseFloat(t.trashOther || 0);

            // แปลงรูปแบบวันที่
            const dateStr = new Date(t.timestamp).toLocaleString('th-TH', { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
            });

            tableHTML += `
                <tr class="hover:bg-blue-50">
                    <td class="p-3 text-gray-500">${dateStr}</td>
                    <td class="p-3 font-bold text-gray-800">${t.name}</td>
                    <td class="p-3 text-blue-600">${t.community || '-'}</td>
                    <td class="p-3 text-right font-bold text-green-600">฿${parseFloat(t.totalIncome || 0).toLocaleString()}</td>
                </tr>
            `;
        });
    }

    // แสดงผลตัวเลข
    document.getElementById('sumTotal').innerText = `฿${sumTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('sumGlass').innerText = sumGlass.toLocaleString();
    document.getElementById('sumPaper').innerText = sumPaper.toLocaleString();
    document.getElementById('sumPlastic').innerText = sumPlastic.toLocaleString();
    document.getElementById('sumMetalOther').innerText = (sumMetal + sumOther).toLocaleString();
    
    tableBody.innerHTML = tableHTML;

    // อัพเดตกราฟ
    renderChart([sumGlass, sumPaper, sumPlastic, sumMetal, sumOther]);
}

function renderChart(chartData) {
    const ctx = document.getElementById('trashChart').getContext('2d');
    
    if (chartInstance) { chartInstance.destroy(); }
    
    // ถ้าไม่มีข้อมูลเลย ให้แสดงกราฟว่างๆ
    const isEmpty = chartData.every(val => val === 0);

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['แก้ว', 'กระดาษ', 'พลาสติก', 'โลหะ', 'อื่นๆ'],
            datasets: [{
                data: isEmpty ? [1] : chartData,
                backgroundColor: isEmpty 
                    ? ['#e2e8f0'] 
                    : ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { enabled: !isEmpty }
            }
        }
    });
}

// ผูก Event Listener เมื่อมีการเปลี่ยนตัวกรอง
filterYear.addEventListener('change', applyFilters);
filterMonth.addEventListener('change', applyFilters);
filterCommunity.addEventListener('input', applyFilters);

// เริ่มโหลดข้อมูลครั้งแรก
loadTransactions();