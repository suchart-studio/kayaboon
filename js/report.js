import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let allTrashRecords = [];
let typeChartInstance = null;
let barChartInstance = null;

// ข้อมูลชุมชนสำหรับ Filter
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า 1", "เมืองเก่า 2", "เมืองเก่า 3", "เมืองเก่า 4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน.", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน1", "โนนทัน2", "โนนทัน3", "โนนทัน4", "โนนทัน5", "โนนทัน 6", "โนนทัน7", "โนนทัน8", "โนนทัน9", "การเคหะ", "เหล่านาดี12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจ", "95 ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล"]
};

const filterYear = document.getElementById('filterYear');
const filterMonth = document.getElementById('filterMonth');
const filterCommunity = document.getElementById('filterCommunity');

async function initDashboard() {
    await fetchMemberSummary();
    await loadTrashData();
    setupFilters();
    updateDashboard();
}

// 1. ดึงสรุปสมาชิก
async function fetchMemberSummary() {
    try {
        const snap = await getDocs(collection(db, "members"));
        let totalMembers = 0, totalBalance = 0, activeCount = 0;
        snap.forEach(doc => {
            const d = doc.data();
            totalMembers++;
            totalBalance += parseFloat(d.balance || 0);
            if (d.status === 'ผ่านเกณฑ์') activeCount++;
        });
        document.getElementById('dashTotalMembers').innerText = totalMembers.toLocaleString();
        document.getElementById('dashTotalBalance').innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2});
        document.getElementById('dashActiveMembers').innerText = activeCount.toLocaleString();
    } catch (e) { console.error(e); }
}

// 2. ดึงข้อมูลขยะทั้งหมด
async function loadTrashData() {
    try {
        const q = query(collection(db, "trash_records"), orderBy("date", "desc"));
        const snap = await getDocs(q);
        allTrashRecords = [];
        snap.forEach(doc => allTrashRecords.push(doc.data()));
    } catch (e) { console.error(e); }
}

// 3. ตั้งค่า Dropdowns
function setupFilters() {
    let years = new Set();
    let allComms = [];
    for(let z in communityData) allComms = allComms.concat(communityData[z]);
    allComms.sort().forEach(c => filterCommunity.innerHTML += `<option value="${c}">${c}</option>`);

    allTrashRecords.forEach(r => { if(r.date) years.add(r.date.substring(0, 4)); });
    Array.from(years).sort().reverse().forEach(y => filterYear.innerHTML += `<option value="${y}">${y}</option>`);

    const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    months.forEach((m, i) => filterMonth.innerHTML += `<option value="${(i+1).toString().padStart(2,'0')}">${m}</option>`);

    [filterYear, filterMonth, filterCommunity].forEach(el => el.addEventListener('change', updateDashboard));
    document.getElementById('resetFilterBtn').onclick = () => {
        filterYear.value = filterMonth.value = filterCommunity.value = 'all';
        updateDashboard();
    };
}

// 4. คำนวณและอัปเดต UI
function updateDashboard() {
    const y = filterYear.value, m = filterMonth.value, c = filterCommunity.value;

    const filtered = allTrashRecords.filter(r => {
        if (!r.date) return false;
        const matchY = (y === 'all' || r.date.startsWith(y));
        const matchM = (m === 'all' || r.date.substring(5, 7) === m);
        const matchC = (c === 'all' || r.community === c);
        return matchY && matchM && matchC;
    });

    let totalKg = 0, sumGlass = 0, sumPaper = 0, sumPlastic = 0, sumMetal = 0, sumOther = 0;
    let commMap = {}, tableHtml = '';

    filtered.forEach(d => {
        const rowTotal = parseFloat(d.total || 0);
        totalKg += rowTotal;
        sumGlass += parseFloat(d.glass || 0);
        sumPaper += parseFloat(d.paper || 0);
        sumPlastic += parseFloat(d.plastic || 0);
        sumMetal += parseFloat(d.metal || 0);
        sumOther += parseFloat(d.other || 0);

        if(d.community) commMap[d.community] = (commMap[d.community] || 0) + rowTotal;

        tableHtml += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-50">
                <td class="p-4 font-mono text-slate-500">${d.date}</td>
                <td class="p-4 font-medium text-slate-700">${d.community}</td>
                <td class="p-4 text-right">${(d.glass || 0).toFixed(2)}</td>
                <td class="p-4 text-right">${(d.paper || 0).toFixed(2)}</td>
                <td class="p-4 text-right">${(d.plastic || 0).toFixed(2)}</td>
                <td class="p-4 text-right font-bold text-blue-600">${rowTotal.toFixed(2)}</td>
            </tr>`;
    });

    document.getElementById('dashTotalTrash').innerText = totalKg.toFixed(2) + ' กก.';
    document.getElementById('dashTrashTable').innerHTML = tableHtml || '<tr><td colspan="6" class="p-8 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไข</td></tr>';

    renderCharts(sumGlass, sumPaper, sumPlastic, sumMetal, sumOther, commMap);
    renderRanking(commMap);
}

// 5. ระบบ Ranking
function renderRanking(commMap) {
    const list = document.getElementById('rankingList');
    list.innerHTML = '';
    const sorted = Object.keys(commMap).sort((a,b) => commMap[b] - commMap[a]);

    if(sorted.length === 0) { list.innerHTML = '<p class="text-center py-4 text-slate-400">ไม่มีข้อมูล</p>'; return; }

    sorted.forEach((name, i) => {
        let badge = (i===0) ? '🥇' : (i===1) ? '🥈' : (i===2) ? '🥉' : `${i+1}.`;
        let bg = (i<3) ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100';
        list.innerHTML += `
            <div class="flex justify-between items-center p-3 border rounded-xl mb-2 ${bg}">
                <span class="font-bold text-slate-700">${badge} ${name}</span>
                <span class="font-bold text-blue-600">${commMap[name].toFixed(2)} กก.</span>
            </div>`;
    });
}

// 6. กราฟ
function renderCharts(glass, paper, plastic, metal, other, commMap) {
    // Doughnut Chart
    const ctx1 = document.getElementById('trashTypeChart').getContext('2d');
    if (typeChartInstance) typeChartInstance.destroy();
    typeChartInstance = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['แก้ว', 'กระดาษ', 'พลาสติก', 'โลหะ', 'อื่นๆ'],
            datasets: [{
                data: [glass, paper, plastic, metal, other],
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#a855f7']
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Bar Chart
    const ctx2 = document.getElementById('communityBarChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();
    const topLabels = Object.keys(commMap).sort((a,b) => commMap[b] - commMap[a]).slice(0, 10);
    const topValues = topLabels.map(l => commMap[l]);

    barChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: topLabels,
            datasets: [{ label: 'น้ำหนัก (กก.)', data: topValues, backgroundColor: '#3b82f6', borderRadius: 5 }]
        },
        options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

initDashboard();
