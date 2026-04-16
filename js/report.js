import { db } from "./firebase-config.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let allTransactions = [];
let allCommunities = []; // ตัวแปรเก็บรายชื่อชุมชนทั้งหมดจากลิงก์ CSV
let chartInstance = null;

// ลิงก์ CSV ฐานข้อมูลชุมชนที่คุณต้องการ
const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhHC9IbuGx_FaOXsTN5fByehHU9vMe0nMC4QB5K-A1sM5_ePe-R1J0ecfo7Qx4XQOyHWJf0lv4k9Jv/pub?output=csv";

// Element References
const filterYear = document.getElementById('filterYear');
const filterMonth = document.getElementById('filterMonth');
const filterCommunity = document.getElementById('filterCommunity');
const tableBody = document.getElementById('transactionTable');
const communitySummaryTable = document.getElementById('communitySummaryTable');

// ฟังก์ชันดึงรายชื่อชุมชนจาก CSV (เพื่อตั้งโครงตารางรอไว้เลยแม้ไม่มีข้อมูล)
async function fetchCommunitiesFromCSV() {
    try {
        const res = await fetch(csvUrl);
        const arrayBuffer = await res.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        const communities = [];
        json.forEach(row => {
            // ระบบจะพยายามค้นหาคอลัมน์ที่เป็น "ชื่อชุมชน"
            let commName = row['ชุมชน'] || row['ชื่อชุมชน'] || row['ชุมชน/หมู่บ้าน'] || Object.values(row)[0]; 
            
            // กรณีคอลัมน์แรกเป็นตัวเลขลำดับ (No.) ให้ดึงคอลัมน์ที่ 2 แทน
            if (commName && !isNaN(commName) && Object.values(row).length > 1) {
                commName = Object.values(row)[1];
            }

            if (commName && String(commName).trim() !== '') {
                communities.push(String(commName).trim());
            }
        });
        
        // ลบชื่อที่ซ้ำกัน และเรียงตามตัวอักษร
        allCommunities = [...new Set(communities)].sort();

        // นำรายชื่อชุมชนทั้งหมดไปใส่ใน Dropdown ตัวกรอง
        allCommunities.forEach(c => {
            filterCommunity.innerHTML += `<option value="${c}">${c}</option>`;
        });

    } catch (err) {
        console.error("Error fetching CSV communities:", err);
    }
}

// โหลดข้อมูล Transaction จาก Firebase
async function fetchTransactionsFromFirebase() {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    allTransactions = [];
    querySnapshot.forEach((doc) => {
        allTransactions.push({ id: doc.id, ...doc.data() });
    });
}

// เริ่มโหลดข้อมูลทั้งหมดพร้อมกัน
async function loadData() {
    tableBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูลรายงาน...</td></tr>';
    communitySummaryTable.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังตรวจสอบรายชื่อชุมชน...</td></tr>';
    
    try {
        await Promise.all([
            fetchCommunitiesFromCSV(),
            fetchTransactionsFromFirebase()
        ]);
        
        applyFilters(); // เมื่อโหลดเสร็จให้ทำการคำนวณและแสดงผล
    } catch (error) {
        console.error("Error loading data:", error);
        tableBody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

// ฟังก์ชันกรองข้อมูลตาม เดือน/ปี
function applyFilters() {
    const fYear = filterYear.value;
    const fMonth = filterMonth.value;

    const filtered = allTransactions.filter(t => {
        if (!t.timestamp) return false;
        const dateObj = new Date(t.timestamp);
        const tYear = dateObj.getFullYear().toString();
        const tMonth = String(dateObj.getMonth() + 1).padStart(2, '0'); // เดือน 01-12

        const matchYear = (fYear === 'all') || (tYear === fYear);
        const matchMonth = (fMonth === 'all') || (tMonth === fMonth);

        return matchYear && matchMonth;
    });

    updateDashboard(filtered);
}

// ฟังก์ชันอัพเดตหน้าจอทั้งหมด (ตารางชุมชน, ตารางประวัติ, ตัวเลข, กราฟ)
function updateDashboard(data) {
    // 1. เตรียมโครงสร้างบัญชีของทุกชุมชนให้เป็น 0 ไว้ก่อน
    const summaryByComm = {};
    allCommunities.forEach(c => {
        summaryByComm[c] = { glass: 0, paper: 0, plastic: 0, metal: 0, other: 0, total: 0 };
    });

    let sumTotal = 0, sumGlass = 0, sumPaper = 0, sumPlastic = 0, sumMetal = 0, sumOther = 0;
    let transactionHTML = '';

    // 2. นำข้อมูลที่มีการขายจริงมาบวกเพิ่มในแต่ละชุมชน
    data.forEach(t => {
        const c = (t.community || 'ไม่ระบุชุมชน').trim();
        
        // ถ้าบังเอิญมีชื่อชุมชนที่ไม่ได้อยู่ใน CSV โผล่มา ให้สร้างรองรับไว้
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

        // รวมยอดสถิติใหญ่ด้านบน
        sumTotal += income;
        sumGlass += glass;
        sumPaper += paper;
        sumPlastic += plastic;
        sumMetal += metal;
        sumOther += other;
    });

    // 3. กรองตารางตามที่ผู้ใช้เลือกใน Dropdown "ชุมชน"
    const fComm = filterCommunity.value;
    
    // สร้างตารางสรุป "ทุกชุมชน"
    let summaryHTML = '';
    Object.keys(summaryByComm).sort().forEach(commName => {
        if (fComm !== 'all' && commName !== fComm) return; // ซ่อนถ้าผู้ใช้เลือกดูเฉพาะชุมชนใดชุมชนหนึ่ง
        
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

    // 4. สร้างตาราง "ประวัติการทำรายการ" (Transactions log)
    // กรองประวัติให้ตรงกับชุมชนที่เลือกด้วย
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

    // อัพเดตตัวเลขแสดงผลใหญ่ด้านบนสุด (สรุปตามเงื่อนไขทั้งหมด)
    document.getElementById('sumTotal').innerText = `฿${sumTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('sumGlass').innerText = sumGlass.toLocaleString();
    document.getElementById('sumPaper').innerText = sumPaper.toLocaleString();
    document.getElementById('sumPlastic').innerText = sumPlastic.toLocaleString();
    document.getElementById('sumMetalOther').innerText = (sumMetal + sumOther).toLocaleString();
    
    // วาดกราฟ
    renderChart([sumGlass, sumPaper, sumPlastic, sumMetal, sumOther]);
}

// ฟังก์ชันสร้างกราฟโดนัท (Doughnut Chart)
function renderChart(chartData) {
    const ctx = document.getElementById('trashChart').getContext('2d');
    
    // ลบกราฟเก่าทิ้งก่อนวาดใหม่
    if (chartInstance) { chartInstance.destroy(); }
    
    const isEmpty = chartData.every(val => val === 0);

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['แก้ว', 'กระดาษ', 'พลาสติก', 'โลหะ', 'อื่นๆ'],
            datasets: [{
                data: isEmpty ? [1] : chartData,
                backgroundColor: isEmpty 
                    ? ['#e2e8f0']  // ถ้าว่างจะโชว์สีเทา
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

// ผูก Event ให้ทำงานเมื่อมีการเลือกเปลี่ยนเงื่อนไข (เดือน, ปี, ชุมชน)
filterYear.addEventListener('change', applyFilters);
filterMonth.addEventListener('change', applyFilters);
filterCommunity.addEventListener('change', applyFilters);

// เริ่มโหลดข้อมูลครั้งแรกที่เปิดหน้า
loadData();
