import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ตัวแปรเก็บ Instance ของกราฟ (เพื่อทำลายทิ้งก่อนวาดใหม่)
let typeChartInstance = null;
let barChartInstance = null;

async function initDashboard() {
    await fetchMemberSummary();
    await fetchTrashDashboard();
}

// 1. สรุปข้อมูลสมาชิก (จาก Collection members)
async function fetchMemberSummary() {
    const snap = await getDocs(collection(db, "members"));
    let totalMembers = 0;
    let totalBalance = 0;
    let activeCount = 0;

    snap.forEach(doc => {
        const data = doc.data();
        totalMembers++;
        totalBalance += parseFloat(data.balance || 0);
        if (data.status === 'ผ่านเกณฑ์') activeCount++;
    });

    document.getElementById('dashTotalMembers').innerText = totalMembers.toLocaleString();
    document.getElementById('dashTotalBalance').innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('dashActiveMembers').innerText = activeCount.toLocaleString();
}

// 2. สรุปข้อมูลขยะ (จาก Collection trash_records)
async function fetchTrashDashboard() {
    const q = query(collection(db, "trash_records"), orderBy("date", "desc"));
    const snap = await getDocs(q);

    let totalTrashValue = 0;
    let sumGlass = 0, sumPaper = 0, sumPlastic = 0, sumMetal = 0, sumOther = 0;
    let communityTotals = {};
    let tableHtml = '';

    snap.forEach(doc => {
        const data = doc.data();
        totalTrashValue += data.total;
        
        // รวมยอดตามประเภท
        sumGlass += data.glass || 0;
        sumPaper += data.paper || 0;
        sumPlastic += data.plastic || 0;
        sumMetal += data.metal || 0;
        sumOther += data.other || 0;

        // รวมยอดรายชุมชน
        communityTotals[data.community] = (communityTotals[data.community] || 0) + data.total;

        // สร้างแถวในตาราง (แสดงล่าสุด 10 รายการ)
        tableHtml += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 font-medium">${data.date}</td>
                <td class="p-4">${data.community}</td>
                <td class="p-4 text-right">฿${(data.glass || 0).toLocaleString()}</td>
                <td class="p-4 text-right">฿${(data.paper || 0).toLocaleString()}</td>
                <td class="p-4 text-right">฿${(data.plastic || 0).toLocaleString()}</td>
                <td class="p-4 text-right font-bold text-blue-600">฿${data.total.toLocaleString()}</td>
            </tr>
        `;
    });

    document.getElementById('dashTotalTrash').innerText = '฿' + totalTrashValue.toLocaleString();
    document.getElementById('dashTrashTable').innerHTML = tableHtml;

    renderTypeChart([sumGlass, sumPaper, sumPlastic, sumMetal, sumOther]);
    renderBarChart(communityTotals);
}

// กราฟวงกลมประเภทขยะ
function renderTypeChart(data) {
    const ctx = document.getElementById('trashTypeChart').getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();

    typeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['แก้ว', 'กระดาษ', 'พลาสติก', 'โลหะ', 'อื่นๆ'],
            datasets: [{
                data: data,
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#a855f7'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Chakra Petch' } } }
            }
        }
    });
}

// กราฟแท่งรายชุมชน
function renderBarChart(communityData) {
    const ctx = document.getElementById('communityBarChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();

    // เรียงลำดับชุมชนที่ยอดเยอะที่สุด 10 อันดับแรก
    const sortedLabels = Object.keys(communityData).sort((a, b) => communityData[b] - communityData[a]).slice(0, 10);
    const sortedValues = sortedLabels.map(label => communityData[label]);

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'ยอดเงินรวม (บาท)',
                data: sortedValues,
                backgroundColor: '#3b82f6',
                borderRadius: 6
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// รันระบบ
initDashboard();
