import { db } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const tableBody = document.getElementById('adminMemberTable');
const memberModal = document.getElementById('memberModal');
const memberForm = document.getElementById('memberForm');

let allMembers = [];
let filteredMembers = [];
let currentPage = 1;
const rowsPerPage = 50; 

// ----------------------------------------------------
// ระบบ Login ผู้ดูแล
// ----------------------------------------------------
const loginOverlay = document.getElementById('loginOverlay');
const adminContent = document.getElementById('adminContent');
const loginError = document.getElementById('loginError');
const adminPasswordInput = document.getElementById('adminPassword');

if (sessionStorage.getItem('adminAuth') === 'true') {
    loginOverlay.classList.add('hidden');
    adminContent.classList.remove('hidden');
    fetchAdminMembers();
}

window.checkPassword = () => {
    if (adminPasswordInput.value === '987654321') {
        sessionStorage.setItem('adminAuth', 'true');
        loginOverlay.classList.add('hidden');
        adminContent.classList.remove('hidden');
        fetchAdminMembers();
    } else {
        loginError.classList.remove('hidden');
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    }
};

adminPasswordInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') checkPassword();
});

window.logoutAdmin = () => {
    sessionStorage.removeItem('adminAuth');
    location.reload(); 
};

// ----------------------------------------------------
// ข้อมูลชุมชนที่ฝังอยู่ในระบบ
// ----------------------------------------------------
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "ชลประทาน", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า 1", "เมืองเก่า 2", "เมืองเก่า 3", "เมืองเก่า 4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน.", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน1", "โนนทัน2", "โนนทัน3", "โนนทัน4", "โนนทัน5", "โนนทัน 6", "โนนทัน7", "โนนทัน8", "โนนทัน9", "การเคหะ", "เหล่านาดี12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจ", "95 ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล"]
};

const communitySelect = document.getElementById('memberCommunity');

window.handleZoneChange = () => {
    populateCommunities(document.getElementById('memberZone').value);
};

function populateCommunities(zoneValue, selectedCommunity = "") {
    communitySelect.innerHTML = '<option value="">-- เลือกชุมชน --</option>';
    if (zoneValue && communityData[zoneValue]) {
        communityData[zoneValue].forEach(comm => {
            const isSelected = comm === selectedCommunity ? 'selected' : '';
            communitySelect.innerHTML += `<option value="${comm}" ${isSelected}>${comm}</option>`;
        });
    } else {
        communitySelect.innerHTML = '<option value="">-- กรุณาเลือกเขตก่อน --</option>';
    }
}

function updateAdminDashboardSummary(members) {
    let totalBalance = 0;
    let activeCount = 0;
    let inactiveCount = 0;

    members.forEach(m => {
        totalBalance += parseFloat(m.balance || 0);
        if (m.status === 'ผ่านเกณฑ์') activeCount++;
        else inactiveCount++;
    });

    document.getElementById('adminTotalBalance').innerText = '฿' + totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('adminTotalMembers').innerHTML = `${members.length.toLocaleString()} <span class="text-base font-normal">คน</span>`;
    document.getElementById('adminActive').innerText = activeCount.toLocaleString();
    document.getElementById('adminInactive').innerText = inactiveCount.toLocaleString();
}

// ----------------------------------------------------
// ระบบคำนวณเงินและสถานะ
// ----------------------------------------------------
const depositInput = document.getElementById('deposit');
const trashIncomeInput = document.getElementById('trashIncome'); 
const withdrawInput = document.getElementById('withdraw');
const deductionInput = document.getElementById('deduction');
const balanceInput = document.getElementById('memberBalance');
const statusInput = document.getElementById('memberStatus');

function calculateBalance() {
    const d = parseFloat(depositInput.value) || 0;
    const tAccum = parseFloat(trashIncomeInput.value) || 0;
    const w = parseFloat(withdrawInput.value) || 0;
    const ded = parseFloat(deductionInput.value) || 0;
    
    const currentBalance = (d + tAccum) - w - ded;
    balanceInput.value = currentBalance.toFixed(2); 

    // เงื่อนไขสถานะใหม่: คิดจากเงิน >= 300 อย่างเดียว
    if (currentBalance >= 300) {
        statusInput.value = 'ผ่านเกณฑ์';
        statusInput.className = "w-full p-2 text-center border-2 border-green-500 rounded-lg bg-green-100 text-green-700 font-bold";
    } else {
        statusInput.value = 'ไม่ผ่านเกณฑ์';
        statusInput.className = "w-full p-2 text-center border-2 border-red-500 rounded-lg bg-red-100 text-red-700 font-bold";
    }
}

document.querySelectorAll('.calc-input').forEach(input => {
    input.addEventListener('input', calculateBalance);
    input.addEventListener('change', calculateBalance);
});

// ----------------------------------------------------
// ระบบนำเข้าข้อมูล Excel (Upload Excel)
// ----------------------------------------------------
document.getElementById('excelUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if(confirm(`พบข้อมูลสมาชิกจำนวน ${json.length} รายการ ต้องการนำเข้าสู่ฐานข้อมูลหรือไม่?`)) {
            await importExcelToFirebase(json);
        }
        document.getElementById('excelUpload').value = ''; 
    };
    reader.readAsArrayBuffer(file);
});

async function importExcelToFirebase(data) {
    tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-indigo-600 font-bold animate-pulse text-lg">กำลังอัพโหลดข้อมูล...</td></tr>';
    let count = 0;
    let batches = [];
    let batch = writeBatch(db);
    
    for(let i=0; i<data.length; i++) {
        let row = data[i];
        const name = row['ชื่อ สกุล'] || row['ชื่อ-สกุล'] || row['ชื่อ-นามสกุล'];
        if(!name) continue; 
        
        const d = parseFloat(row['เงินฝาก'] || 0);
        const t = parseFloat(row['ค่าขายขยะ'] || row['ขายขยะสะสม'] || 0);
        const w = parseFloat(row['ถอนเงิน'] || 0);
        const ded = parseFloat(row['หักฌาปนกิจ'] || 0);
        const forceCalculatedBalance = (d + t) - w - ded;

        const t6m = parseFloat(row['ขายขยะใน 6 เดือน'] || row['ขยะ 6 เดือน'] || 0);

        // คำนวณสถานะใหม่
        const autoStatus = (forceCalculatedBalance >= 300) ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์';

        const mId = String(row['เลขสมาชิก'] || row['รหัสสมาชิก'] || (Date.now() + count));
        const memberData = {
            memberId: mId,
            name: name,
            zone: String(row['เขต'] || ''),
            community: String(row['ชุมชน'] || row['ชื่อชุมชน'] || ''),
            joinDate: String(row['วันที่สมัคร'] || ''),
            deposit: d,
            trashIncome: t,
            withdraw: w,
            deduction: ded,
            balance: forceCalculatedBalance, 
            trash6Months: t6m,
            status: autoStatus
        };

        const docRef = doc(db, "members", mId);
        batch.set(docRef, memberData);
        count++;

        if (count % 450 === 0) {
            batches.push(batch.commit());
            batch = writeBatch(db);
        }
    }
    
    if (count % 450 !== 0) batches.push(batch.commit());
    await Promise.all(batches);
    
    alert(`อัพโหลดและอัพเดทข้อมูลสำเร็จจำนวน ${count} รายการ!`);
    fetchAdminMembers();
}

window.deleteAllMembers = async () => {
    if (confirm('⚠️ คำเตือน!\nคุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด?')) {
        const pass = prompt('พิมพ์คำว่า "ยืนยันการลบ" เพื่อดำเนินการต่อ');
        if (pass !== 'ยืนยันการลบ') return alert('ยกเลิกการลบข้อมูล');

        try {
            tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-red-600 font-bold animate-pulse">กำลังลบข้อมูลทั้งหมด...</td></tr>';
            const querySnapshot = await getDocs(collection(db, "members"));
            
            let batches = [];
            let batch = writeBatch(db);
            let count = 0;

            querySnapshot.forEach((docSnap) => {
                batch.delete(docSnap.ref);
                count++;
                if (count === 490) {
                    batches.push(batch.commit());
                    batch = writeBatch(db);
                    count = 0;
                }
            });
            if (count > 0) batches.push(batch.commit());
            await Promise.all(batches);

            alert('ลบข้อมูลเรียบร้อยแล้ว');
            fetchAdminMembers();
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
        }
    }
};

// ----------------------------------------------------
// โหลดข้อมูลและแสดงผลในตาราง
// ----------------------------------------------------
async function fetchAdminMembers() {
    tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        allMembers = [];
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลสมาชิก</td></tr>';
            document.getElementById('adminPaginationControls').classList.add('hidden');
            updateAdminDashboardSummary([]); 
            return;
        }

        querySnapshot.forEach((docSnap) => {
            allMembers.push({ id: docSnap.id, ...docSnap.data() });
        });

        updateAdminDashboardSummary(allMembers);
        filteredMembers = [...allMembers]; 
        currentPage = 1;
        displayAdminTable();

    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function displayAdminTable() {
    tableBody.innerHTML = '';
    const totalItems = filteredMembers.length;
    
    if (totalItems === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400">ไม่พบข้อมูลที่ค้นหา</td></tr>';
        document.getElementById('adminPaginationControls').classList.add('hidden');
        return;
    }

    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const displayData = filteredMembers.slice(startIndex, endIndex);

    let htmlString = '';
    displayData.forEach(member => {
        const statusClass = member.status === 'ผ่านเกณฑ์' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
        const commText = member.community ? `${member.community}` : '-';

        htmlString += `
            <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
                <td class="p-3 font-mono text-gray-600">${member.memberId || member.id}</td>
                <td class="p-3 font-bold text-gray-800">${member.name}</td>
                <td class="p-3 text-blue-600 text-xs">${commText} (ข.${member.zone})</td>
                <td class="p-3 text-right text-green-600">${parseFloat(member.deposit || 0).toLocaleString()}</td>
                <td class="p-3 text-right text-indigo-600 font-bold">${parseFloat(member.trashIncome || 0).toLocaleString()}</td>
                <td class="p-3 text-right text-yellow-600">${parseFloat(member.trash6Months || 0).toLocaleString()}</td>
                <td class="p-3 text-right font-bold text-blue-700 bg-blue-50/50">฿${parseFloat(member.balance || 0).toLocaleString()}</td>
                <td class="p-3 text-center">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${member.status}</span>
                </td>
                <td class="p-3 text-center space-x-2">
                    <button onclick="openModal('edit', '${member.id}')" class="text-blue-500 hover:text-blue-800 font-bold underline">แก้ไข</button>
                    <button onclick="deleteMember('${member.id}')" class="text-red-400 hover:text-red-700 font-bold underline">ลบ</button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = htmlString;
    document.getElementById('adminPaginationControls').classList.remove('hidden');
    document.getElementById('adminPageInfo').innerText = `หน้า ${currentPage} จาก ${totalPages}`;
}

window.prevAdminPage = () => {
    if (currentPage > 1) { currentPage--; displayAdminTable(); }
};

window.nextAdminPage = () => {
    const totalPages = Math.ceil(filteredMembers.length / rowsPerPage);
    if (currentPage < totalPages) { currentPage++; displayAdminTable(); }
};

// ----------------------------------------------------
// จัดการหน้าต่าง Form (Modal)
// ----------------------------------------------------
window.openModal = (mode, id = null) => {
    document.getElementById('formMode').value = mode;

    if (mode === 'add') {
        document.getElementById('modalTitle').innerText = 'เพิ่มสมาชิกใหม่';
        memberForm.reset();
        document.getElementById('memberId').readOnly = false;
        document.getElementById('docId').value = '';
        populateCommunities(""); 
        
        document.getElementById('trash6Months').value = 0;

        ['ben1Name', 'ben2Name', 'ben3Name', 'rec1Name', 'rec2Name', 'rec3Name'].forEach(field => document.getElementById(field).value = '');
        ['ben1Status', 'ben2Status', 'ben3Status'].forEach(field => document.getElementById(field).value = 'ยังไม่รับ');

        calculateBalance(); 
    } else if (mode === 'edit') {
        document.getElementById('modalTitle').innerText = 'แก้ไขข้อมูลสมาชิก';
        const member = allMembers.find(m => m.id === id);
        if (member) {
            document.getElementById('docId').value = id;
            document.getElementById('memberId').value = member.memberId || id;
            document.getElementById('memberId').readOnly = true;
            document.getElementById('memberName').value = member.name;
            document.getElementById('memberZone').value = member.zone || '';
            populateCommunities(member.zone || '', member.community || '');
            document.getElementById('joinDate').value = member.joinDate || '';
            
            document.getElementById('deposit').value = member.deposit || 0;
            document.getElementById('trashIncome').value = member.trashIncome || 0;
            document.getElementById('withdraw').value = member.withdraw || 0;
            document.getElementById('deduction').value = member.deduction || 0;
            document.getElementById('trash6Months').value = member.trash6Months || 0;

            document.getElementById('ben1Name').value = member.ben1Name || '';
            document.getElementById('ben1Status').value = member.ben1Status || 'ยังไม่รับ';
            document.getElementById('ben2Name').value = member.ben2Name || '';
            document.getElementById('ben2Status').value = member.ben2Status || 'ยังไม่รับ';
            document.getElementById('ben3Name').value = member.ben3Name || '';
            document.getElementById('ben3Status').value = member.ben3Status || 'ยังไม่รับ';
            
            document.getElementById('rec1Name').value = member.rec1Name || '';
            document.getElementById('rec2Name').value = member.rec2Name || '';
            document.getElementById('rec3Name').value = member.rec3Name || '';
            
            calculateBalance(); 
        }
    }
    memberModal.classList.remove('hidden');
};

window.closeModal = () => { memberModal.classList.add('hidden'); };

// ----------------------------------------------------
// บันทึกข้อมูลและสร้าง Transaction
// ----------------------------------------------------
memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('formMode').value;
    const docId = document.getElementById('docId').value;
    const mId = document.getElementById('memberId').value;
    
    calculateBalance();

    const data = {
        memberId: mId,
        name: document.getElementById('memberName').value,
        zone: document.getElementById('memberZone').value,
        community: document.getElementById('memberCommunity').value,
        joinDate: document.getElementById('joinDate').value,
        deposit: parseFloat(document.getElementById('deposit').value) || 0,
        trashIncome: parseFloat(document.getElementById('trashIncome').value) || 0, 
        withdraw: parseFloat(document.getElementById('withdraw').value) || 0,
        deduction: parseFloat(document.getElementById('deduction').value) || 0,
        balance: parseFloat(document.getElementById('memberBalance').value) || 0, 
        trash6Months: parseFloat(document.getElementById('trash6Months').value) || 0,
        status: document.getElementById('memberStatus').value,
        
        ben1Name: document.getElementById('ben1Name').value.trim(),
        ben1Status: document.getElementById('ben1Status').value,
        ben2Name: document.getElementById('ben2Name').value.trim(),
        ben2Status: document.getElementById('ben2Status').value,
        ben3Name: document.getElementById('ben3Name').value.trim(),
        ben3Status: document.getElementById('ben3Status').value,
        rec1Name: document.getElementById('rec1Name').value.trim(),
        rec2Name: document.getElementById('rec2Name').value.trim(),
        rec3Name: document.getElementById('rec3Name').value.trim()
    };

    try {
        if (mode === 'add') { await setDoc(doc(db, "members", mId), data); }
        else if (mode === 'edit') { await updateDoc(doc(db, "members", docId), data); }
        
        closeModal();
        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
        fetchAdminMembers(); 
    } catch (error) { alert('เกิดข้อผิดพลาด: ' + error.message); }
});

// ----------------------------------------------------
// ระบบส่งออกข้อมูล (Export to Excel)
// ----------------------------------------------------
window.exportToExcel = () => {
    if (allMembers.length === 0) {
        alert('ไม่มีข้อมูลสมาชิกในระบบสำหรับส่งออกครับ');
        return;
    }

    alert('กำลังเตรียมไฟล์ Excel กรุณารอสักครู่...');

    const exportData = allMembers.map(m => ({
        'เลขสมาชิก': m.memberId || m.id,
        'ชื่อ-สกุล': m.name || '',
        'เขต': m.zone || '',
        'ชุมชน': m.community || '',
        'วันที่สมัคร': m.joinDate || '',
        'เงินฝาก': parseFloat(m.deposit || 0),
        'ขายขยะสะสม': parseFloat(m.trashIncome || 0),
        'ขายขยะใน 6 เดือน': parseFloat(m.trash6Months || 0),
        'ถอนเงิน': parseFloat(m.withdraw || 0),
        'หักฌาปนกิจ': parseFloat(m.deduction || 0),
        'ยอดเงินคงเหลือ': parseFloat(m.balance || 0),
        'สถานะสมาชิก': m.status || 'ไม่ผ่านเกณฑ์',
        'ผู้รับสิทธิ์คนที่ 1': m.ben1Name || '',
        'สถานะ 1': m.ben1Status || '',
        'ผู้รับสิทธิ์คนที่ 2': m.ben2Name || '',
        'สถานะ 2': m.ben2Status || '',
        'ผู้รับสิทธิ์คนที่ 3': m.ben3Name || '',
        'สถานะ 3': m.ben3Status || '',
        'ผู้รับเงินลำดับ 1': m.rec1Name || '',
        'ผู้รับเงินลำดับ 2': m.rec2Name || '',
        'ผู้รับเงินลำดับ 3': m.rec3Name || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ข้อมูลสมาชิก");

    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    const fileName = `ข้อมูลสมาชิก_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
};

// ----------------------------------------------------
// ระบบลบสมาชิก
// ----------------------------------------------------
window.deleteMember = async (id) => {
    if (confirm('ยืนยันการลบสมาชิกรายนี้?')) {
        try { 
            await deleteDoc(doc(db, "members", id)); 
            fetchAdminMembers(); 
        }
        catch (error) { alert('ลบไม่สำเร็จ: ' + error.message); }
    }
};

// ----------------------------------------------------
// ระบบค้นหาสมาชิก (Search)
// ----------------------------------------------------
document.getElementById('adminSearchInput').addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (term === '') {
        filteredMembers = [...allMembers];
    } else {
        filteredMembers = allMembers.filter(m => 
            (m.name && m.name.toLowerCase().includes(term)) || 
            (m.memberId && String(m.memberId).toLowerCase().includes(term)) ||
            (m.community && m.community.toLowerCase().includes(term))
        );
    }
    currentPage = 1; 
    displayAdminTable();
});
