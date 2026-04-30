import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ตัวแปรเก็บข้อมูล
let allTrashRecords = [];
let typeChartInstance = null;
let barChartInstance = null;

// ข้อมูลชุมชนทั้งหมดเพื่อใส่ใน Dropdown ตัวกรอง
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า 1", "เมืองเก่า 2", "เมืองเก่า 3", "เมืองเก่า 4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน.", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน1", "โนนทัน2", "โนนทัน3", "โนนทัน4", "โนนทัน5", "โนนทัน 6", "โนนทัน7", "โนนทัน8", "โนนทัน9", "การเคหะ", "เหล่านาดี12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจ", "95 ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล"]
};

// ตัวกรอง
const filterYear = document.getElementById('filterYear');
const filterMonth = document.getElementById('filterMonth');
const filterCommunity = document.getElementById('filterCommunity');

async function initDashboard() {
    await fetchMemberSummary(); // โหลดสรุปข้อมูลสมาชิก (ไม่อิงตัวกรองวันที่)
    await loadTrashData();      // โหลดข้อมูลขยะทั้งหมดมาเก็บไว้ใน Array
    setupFilters();             // สร้างตัวเลือกกรองข้อมูล
    updateDashboard();          // เรนเดอร์กราฟ/ตารางรอบแรก
}

// 1. สรุปข้อมูลสมาชิก
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

// 2. โหลดข้อมูลขยะทั้งหมด
async function loadTrashData() {
    const q = query(collection(db, "trash_records"), orderBy("date", "desc"));
    const snap = await getDocs(q);
    
    allTrashRecords = [];
    snap.forEach(doc => {
        allTrashRecords.push(doc.data());
    });
}

// 3. ติดตั้งค่าตัวกรอง (Dropdowns)
function setupFilters() {
    let years = new Set();
    let allComms = [];

    // ดึงชุมชน
    for(let zone in communityData) { allComms = allComms.concat(communityData[zone]); }
    allComms.sort().forEach(c => {
        filterCommunity.innerHTML += `<option value="${c}">${c}</option>`;
    });

    // ดึงปีที่มีในระบบ
    allTrashRecords.forEach(r => {
        if(r.date) years.add(r.date.substring(0, 4)); // "YYYY"
    });
    Array.from(years).sort().reverse().forEach(y => {
        filterYear.innerHTML += `<option value="${y}">${y}</option>`;
    });

    // ใส่เดือน 12 เดือน
    const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    monthNames.forEach((m, i) => {
        let val = (i+1).toString().padStart(2, '0');
        filterMonth.innerHTML += `<option value="${val}">${m}</option>`;
    });

    // Event Listeners
    filterYear.addEventListener('change', updateDashboard);
    filterMonth.addEventListener('change', updateDashboard);
    filterCommunity.addEventListener('change', updateDashboard);

    document.getElementById('resetFilterBtn').addEventListener('click', () => {
        filterYear.value = 'all';
        filterMonth.value = 'all';
        filterCommunity.value = 'all';
        updateDashboard();
    });
}

// 4. อัปเดตข้อมูลและกราฟตามตัวกรอง
function updateDashboard() {
    const y = filterYear.value;
    const m = filterMonth.value;
    const c = filterCommunity.value;

    // กรองข้อมูล
    let filteredData = allTrashRecords.filter(r => {
        if (!r.date) return false;
        let rYear = r.date.substring(0, 4);
        let rMonth = r.date.substring(5, 7);
        
        let matchY = (y === 'all' || rYear === y);
        let matchM = (m === 'all' || rMonth === m);
        let matchC = (c === 'all' || r.community === c);

        return matchY && matchM && matchC;
    });

    // คำนวณยอด
    let totalTrashValue = 0;
    let sumGlass = 0, sumPaper = 0, sumPlastic = 0, sumMetal = 0, sumOther = 0;
    let communityTotals = {};
    let tableHtml = '';

    filteredData.forEach(data => {
        totalTrashValue += parseFloat(data.total || 0);
        sumGlass += parseFloat(data.glass || 0);
        sumPaper += parseFloat(data.paper || 0);
        sumPlastic += parseFloat(data.plastic || 0);
        sumMetal += parseFloat(data.metal || 0);
        sumOther += parseFloat(data.other || 0);

        communityTotals[data.community] = (communityTotals[data.community] || 0) + parseFloat(data.total || 0);

        tableHtml += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="p-4 font-mono text-slate-500">${data.date}</td>
                <td class="p-4 font-medium text-slate-700">${data.community}</td>
                <td class="p-4 text-right">฿${(data.glass || 0).toLocaleString()}</td>
                <td class="p-4 text-right">฿${(data.paper || 0).toLocaleString()}</td>
                <td class="p-4 text-right">฿${(data.plastic || 0).toLocaleString()}</td>
                <td class="p-4 text-right font-bold text-blue-600">฿${(data.total || 0).toLocaleString()}</td>
            </tr>
        `;
    });

    // กรณีไม่มีข้อมูล
    if (filteredData.length === 0) {
        tableHtml = `<tr><td colspan="6" class="p-6 text-center text-red-400 font-bold">ไม่มีประวัติการบันทึกขยะในเงื่อนไขนี้</td></tr>`;
    }

    // แสดงผล
    document.getElementById('dashTotalTrash').innerText = '฿' + totalTrashValue.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('dashTrashTable').innerHTML = tableHtml;

    // อัปเดตกราฟและจัดอันดับ
    renderTypeChart([sumGlass, sumPaper, sumPlastic, sumMetal, sumOther]);
    renderRanking(communityTotals);
    renderBarChart(communityTotals);
}

// 5. ระบบจัดอันดับ (Ranking UI)
function renderRanking(communityTotals) {
    const listEl = document.getElementById('rankingList');
    listEl.innerHTML = '';

    // เรียงลำดับจากมากไปน้อย
    const sortedComms = Object.keys(communityTotals).sort((a, b) => communityTotals[b] - communityTotals[a]);

    if(sortedComms.length === 0) {
        listEl.innerHTML = '<p class="text-slate-400 text-center py-4">ไม่มีข้อมูลจัดอันดับ</p>';
        return;
    }

    sortedComms.forEach((comm, index) => {
        let medal = '';
        let bgClass = 'bg-white border-slate-100';
        let textClass = 'text-slate-700';

        if (index === 0) { medal = '🥇'; bgClass = 'bg-yellow-50 border-yellow-200'; textClass = 'text-yellow-700 font-bold'; }
        else if (index === 1) { medal = '🥈'; bgClass = 'bg-slate-100 border-slate-200'; textClass = 'text-slate-600 font-bold'; }
        else if (index === 2) { medal = '🥉'; bgClass = 'bg-orange-50 border-orange-200'; textClass = 'text-orange-700 font-bold'; }
        else { medal = `<span class="inline-block w-5 text-center text-slate-400">${index+1}.</span>`; }

        const amount = communityTotals[comm].toLocaleString(undefined, {minimumFractionDigits: 2});

        listEl.innerHTML += `
            <div class="flex justify-between items-center p-3 border rounded-xl ${bgClass}">
                <span class="flex items-center gap-2 ${textClass}">
                    <span class="text-lg">${medal}</span> ${comm}
                </span>
                <span class="font-bold ${textClass}">฿${amount}</span>
            </div>
        `;
    });
}

// 6. กราฟวงกลม
function renderTypeChart(data) {
    const ctx = document.getElementById('trashTypeChart').getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();

    const isEmpty = data.every(val => val === 0);

    typeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['แก้ว', 'กระดาษ', 'พลาสติก', 'โลหะ', 'อื่นๆ'],
            datasets: [{
                data: isEmpty ? [1] : data,
                backgroundColor: isEmpty ? ['#f1f5f9'] : ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#a855f7'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Chakra Petch' } } },
                tooltip: { enabled: !isEmpty }
            }
        }
    });
}

// 7. กราฟแท่ง
function renderBarChart(communityData) {
    const ctx = document.getElementById('communityBarChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();

    const sortedLabels = Object.keys(communityData).sort((a, b) => communityData[b] - communityData[a]).slice(0, 10);
    const sortedValues = sortedLabels.map(label => communityData[label]);

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'ยอดขยะ (บาท)',
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
            plugins: { legend: { display: false } }
        }
    });
}

initDashboard();
