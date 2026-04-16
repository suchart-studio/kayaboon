import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ข้อมูลชุมชนที่ฝังอยู่ในระบบ
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "ชลประทาน", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า 1", "เมืองเก่า 2", "เมืองเก่า 3", "เมืองเก่า 4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน.", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน1", "โนนทัน2", "โนนทัน3", "โนนทัน4", "โนนทัน5", "โนนทัน 6", "โนนทัน7", "โนนทัน8", "โนนทัน9", "การเคหะ", "เหล่านาดี12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจ", "95 ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล"]
};

let allTransactions = [];
let allCommunities = [];
let chartInstance = null;

// ดึงชื่อชุมชนทั้งหมดมารวมกันและเรียงตามตัวอักษร
for (let zone in communityData) {
    allCommunities = allCommunities.concat(communityData[zone]);
}
allCommunities = [...new Set(allCommunities)].sort();

const filterYear = document.getElementById('filterYear');
const filterMonth = document.getElementById('filterMonth');
const filterCommunity = document.getElementById('filterCommunity');
const tableBody = document.getElementById('transactionTable');
const communitySummaryTable = document.getElementById('communitySummaryTable');

// นำรายชื่อไปใส่ใน Dropdown
allCommunities.forEach(c => {
    filterCommunity.innerHTML += `<option value="${c}">${c}</option>`;
});

async function loadData() {
    tableBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูลรายงาน...</td></tr>';
    
    try {
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        allTransactions = [];
        querySnapshot.forEach((doc) => {
            allTransactions.push({ id: doc.id, ...doc.data() });
        });
        
        applyFilters(); 
    } catch (error) {
        console.error("Error loading data:", error);
        tableBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

function applyFilters() {
    const fYear = filterYear.value;
    const fMonth = filterMonth.value;

    const filtered = allTransactions.filter(t => {
        if (!t.timestamp) return false;
        const dateObj = new Date(t.timestamp);
        const tYear = dateObj.getFullYear().toString();
        const tMonth = String(dateObj.getMonth() + 1).padStart(2, '0');

        const matchYear = (fYear === 'all') || (tYear === fYear);
        const matchMonth = (fMonth === 'all') || (tMonth === fMonth);

        return matchYear && matchMonth;
    });

    updateDashboard(filtered);
}

function updateDashboard(data) {
    const summaryByComm = {};
    allCommunities.forEach(c => {
        summaryByComm[c] = { glass: 0, paper: 0, plastic: 0, metal: 0, other: 0, total: 0 };
    });

    let sumTotal = 0, sumGlass = 0, sumPaper = 0, sumPlastic = 0, sumMetal = 0, sumOther = 0;
    let transactionHTML = '';

    data.forEach(t => {
        const c = (t.community || 'ไม่ระบุชุมชน').trim();
        
        if (!summaryByComm[c]) {
            summaryByComm[c] = { glass: 0, paper: 0, plastic: 0, metal: 0, other: 0, total: 0 };
        }

        const glass = parseFloat(t.trashGlass || 0);
        const paper = parseFloat(t.trashPaper || 0);
        const plastic = parseFloat(t.trashPlastic || 0);
        const metal = parseFloat(t.trashMetal || 0);
        const other = parseFloat(t.trashOther || 0);
        const income = parseFloat(t.totalIncome || 0);

        summaryByComm[c].glass += glass;
        summaryByComm[c].paper += paper;
        summaryByComm[c].plastic += plastic;
        summaryByComm[c].metal += metal;
        summaryByComm[c].other += other;
        summaryByComm[c].total += income;

        sumTotal += income;
        sumGlass += glass;
        sumPaper += paper;
        sumPlastic += plastic;
        sumMetal += metal;
        sumOther += other;
    });

    const fComm = filterCommunity.value;
    
    let summaryHTML = '';
    Object.keys(summaryByComm).sort().forEach(commName => {
        if (fComm !== 'all' && commName !== fComm) return; 
        
        const s = summaryByComm[commName];
        summaryHTML += `
            <tr class="hover:bg-blue-50 transition">
                <td class="p-3 font-bold text-gray-800">${commName}</td>
                <td class="p-3 text-right text-gray-600">${s.glass.toLocaleString()}</td>
                <td class="p-3 text-right text-gray-600">${s.paper.toLocaleString()}</td>
                <td class="p-3 text-right text-gray-600">${s.plastic.toLocaleString()}</td>
                <td class="p-3 text-right text-gray-600">${s.metal.toLocaleString()}</td>
                <td class="p-3 text-right text-gray-600">${s.other.toLocaleString()}</td>
                <td class="p-3 text-right font-bold text-green-600 bg-green-50/30">฿${s.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    if (summaryHTML === '') {
        summaryHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">ไม่มีข้อมูลที่ตรงตามการค้นหา</td></tr>';
    }
    communitySummaryTable.innerHTML = summaryHTML;

    const logData = data.filter(t => fComm === 'all' || (t.community || '').trim() === fComm);
    
    if (logData.length === 0) {
        transactionHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400">ยังไม่มีประวัติการทำรายการตามเงื่อนไขนี้</td></tr>';
    } else {
        logData.forEach(t => {
            const dateStr = new Date(t.timestamp).toLocaleString('th-TH', { 
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' 
            });

            transactionHTML += `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-3 text-gray-500 text-xs">${dateStr}</td>
                    <td class="p-3 font-bold text-gray-800">${t.name}</td>
                    <td class="p-3 text-blue-600 text-xs">${t.community || '-'}</td>
                    <td class="p-3 text-right font-bold text-green-600">฿${parseFloat(t.totalIncome || 0).toLocaleString()}</td>
                </tr>
            `;
        });
    }
    tableBody.innerHTML = transactionHTML;

    document.getElementById('sumTotal').innerText = `฿${sumTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('sumGlass').innerText = sumGlass.toLocaleString();
    document.getElementById('sumPaper').innerText = sumPaper.toLocaleString();
    document.getElementById('sumPlastic').innerText = sumPlastic.toLocaleString();
    document.getElementById('sumMetalOther').innerText = (sumMetal + sumOther).toLocaleString();
    
    renderChart([sumGlass, sumPaper, sumPlastic, sumMetal, sumOther]);
}

function renderChart(chartData) {
    const ctx = document.getElementById('trashChart').getContext('2d');
    
    if (chartInstance) { chartInstance.destroy(); }
    
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
                borderWidth: 0,
                hoverOffset: 4
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

filterYear.addEventListener('change', applyFilters);
filterMonth.addEventListener('change', applyFilters);
filterCommunity.addEventListener('change', applyFilters);

loadData();
