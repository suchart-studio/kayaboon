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
// ระบบ Login
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

const communityData = {
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์ฯ", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์1", "มิตรสัมพันธ์2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์", "ชลประทาน", "เจ้าพ่อขุนภักดี", "ธนาคร", "คุ้มหนองคู", "ศรีจันทร์", "ตรีเทพนครขอนแก่น"],
    "3": ["บ้านตูม", "เมืองเก่า1", "เมืองเก่า2", "เมืองเก่า3", "เมืองเก่า4", "คุ้มวัดกลาง", "คุ้มวัดธาตุ", "หลังสนามกีฬา 1", "หลังสนามกีฬา 2", "แก่นนคร", "กศน", "โนนหนองวัด 1", "โนนหนองวัด 2", "โนนหนองวัด 3", "โนนหนองวัด 4", "หนองวัดพัฒนา", "คุ้มวุฒาราม", "โนนทัน 1", "โนนทัน 2", "โนนทัน 3", "โนนทัน 4", "โนนทัน 5", "โนนทัน 6", "โนนทัน 7", "โนนทัน 8", "โนนทัน 9", "การเคหะ", "เหล่านาดี 12", "พระนครศรีบริรักษ์", "พิมานชลร่วมใจพัฒนา", "ก้าวหน้านคร"],
    "4": ["สามเหลี่ยม 1", "สามเหลี่ยม 2", "สามเหลี่ยม 3", "สามเหลี่ยม 4", "สามเหลี่ยม 5", "ศรีฐาน 1", "ศรีฐาน 2", "ศรีฐาน 3", "ศรีฐาน 4", "หนองแวงตราชู 1", "หนองแวงตราชู 2", "หนองแวงตราชู 3", "หนองแวงตราชู 4", "คุ้มวัดป่าอดุลยาราม", "ไทยสมุทร", "เทคโนภาค", "ตะวันใหม่", "มิตรภาพ", "ตลาดต้นตาล", "พนักงานเทศบาล"]
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
// 💡 สูตรคำนวณและตั้งค่าสถานะ (มีค่าขายขยะ)
// ----------------------------------------------------
const depositInput = document.getElementById('deposit');
const trashInput = document.getElementById('trashIncome'); // ดึงกล่อง ค่าขายขยะ
const withdrawInput = document.getElementById('withdraw');
const deductionInput = document.getElementById('deduction');
const balanceInput = document.getElementById('memberBalance');

function calculateBalance() {
    const d = parseFloat(depositInput.value) || 0;
    const t = parseFloat(trashInput.value) || 0; // เพิ่มค่าขายขยะ
    const w = parseFloat(withdrawInput.value) || 0;
    const ded = parseFloat(deductionInput.value) || 0;
    
    // สูตรใหม่: ฝาก + ค่าขายขยะ - ถอน - หัก
    const currentBalance = (d + t) - w - ded;
    
    balanceInput.value = currentBalance.toFixed(2); 

    if (currentBalance >= 300) {
        document.getElementById('memberStatus').value = 'ผ่านเกณฑ์';
    } else {
        document.getElementById('memberStatus').value = 'ไม่ผ่านเกณฑ์';
    }
}

document.querySelectorAll('.calc-input').forEach(input => {
    input.addEventListener('input', calculateBalance);
});

// ----------------------------------------------------
// ระบบ Excel
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
    tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-indigo-600 font-bold animate-pulse text-lg">กำลังอัพโหลดข้อมูล...</td></tr>';
    let count = 0;
    let batches = [];
    let batch = writeBatch(db);
    
    for(let i=0; i<data.length; i++) {
        let row = data[i];
        const name = row['ชื่อ สกุล'] || row['ชื่อ-สกุล'] || row['ชื่อ-นามสกุล'];
        if(!name) continue; 
        
        const d = parseFloat(row['เงินฝาก'] || 0);
        const t = parseFloat(row['ค่าขายขยะ'] || 0); // อ่านค่าขายขยะจาก Excel ด้วย
        const w = parseFloat(row['ถอนเงิน'] || 0);
        const ded = parseFloat(row['หักฌาปนกิจ'] || 0);
        const forceCalculatedBalance = (d + t) - w - ded;
        const autoStatus = forceCalculatedBalance >= 300 ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์';

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
            tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-red-600 font-bold animate-pulse">กำลังลบข้อมูลทั้งหมด...</td></tr>';
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

async function fetchAdminMembers() {
    tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        allMembers = [];
        
        if (querySnapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400">ยังไม่มีข้อมูลสมาชิก</td></tr>';
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
        tableBody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400">ไม่พบข้อมูลที่ค้นหา</td></tr>';
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
        const commText = member.community ? `${member.community} (เขต ${member.zone})` : '-';

        // แทรกค่าขายขยะเข้ามาในตาราง
        htmlString += `
            <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
                <td class="p-4 font-mono text-gray-600">${member.memberId || member.id}</td>
                <td class="p-4 font-bold text-gray-800">${member.name}</td>
                <td class="p-4 text-blue-600 text-xs">${commText}</td>
                <td class="p-4 text-right text-green-600">${parseFloat(member.deposit || 0).toLocaleString()}</td>
                <td class="p-4 text-right text-indigo-600 font-bold">${parseFloat(member.trashIncome || 0).toLocaleString()}</td>
                <td class="p-4 text-right text-red-500">${parseFloat(member.withdraw || 0).toLocaleString()}</td>
                <td class="p-4 text-right text-orange-500">${parseFloat(member.deduction || 0).toLocaleString()}</td>
                <td class="p-4 text-right font-bold text-blue-700 bg-blue-50/50">฿${parseFloat(member.balance || 0).toLocaleString()}</td>
                <td class="p-4 text-center">
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${member.status}</span>
                </td>
                <td class="p-4 text-center space-x-3">
                    <button onclick="openModal('edit', '${member.id}')" class="text-blue-500 hover:text-blue-800 font-bold underline">แก้ไข</button>
                    <button onclick="deleteMember('${member.id}')" class="text-red-400 hover:text-red-700 font-bold underline">ลบ</button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = htmlString;
    document.getElementById('adminPaginationControls').classList.remove('hidden');
    document.getElementById('adminPageInfo').innerText = `หน้า ${currentPage} จาก ${totalPages} (รวม ${totalItems} รายการ)`;
}

window.prevAdminPage = () => {
    if (currentPage > 1) { currentPage--; displayAdminTable(); }
};

window.nextAdminPage = () => {
    const totalPages = Math.ceil(filteredMembers.length / rowsPerPage);
    if (currentPage < totalPages) { currentPage++; displayAdminTable(); }
};

window.openModal = (mode, id = null) => {
    document.getElementById('formMode').value = mode;

    if (mode === 'add') {
        document.getElementById('modalTitle').innerText = 'เพิ่มสมาชิกใหม่';
        memberForm.reset();
        document.getElementById('memberId').readOnly = false;
        document.getElementById('docId').value = '';
        populateCommunities(""); 
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
            document.getElementById('trashIncome').value = member.trashIncome || 0; // ดึงค่าขายขยะมาแสดง
            document.getElementById('withdraw').value = member.withdraw || 0;
            document.getElementById('deduction').value = member.deduction || 0;
            
            calculateBalance(); 
        }
    }
    memberModal.classList.remove('hidden');
};

window.closeModal = () => { memberModal.classList.add('hidden'); };

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
        trashIncome: parseFloat(document.getElementById('trashIncome').value) || 0, // บันทึกค่าขายขยะ
        withdraw: parseFloat(document.getElementById('withdraw').value) || 0,
        deduction: parseFloat(document.getElementById('deduction').value) || 0,
        balance: parseFloat(document.getElementById('memberBalance').value) || 0, 
        status: document.getElementById('memberStatus').value 
    };

    try {
        if (mode === 'add') { await setDoc(doc(db, "members", mId), data); }
        else if (mode === 'edit') { await updateDoc(doc(db, "members", docId), data); }
        
        closeModal();
        alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
        fetchAdminMembers(); 
    } catch (error) { alert('เกิดข้อผิดพลาด: ' + error.message); }
});

window.deleteMember = async (id) => {
    if (confirm('ยืนยันการลบสมาชิกรายนี้?')) {
        try { 
            await deleteDoc(doc(db, "members", id)); 
            fetchAdminMembers(); 
        }
        catch (error) { alert('ลบไม่สำเร็จ: ' + error.message); }
    }
};

document.getElementById('adminSearchInput').addEventListener('input', (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (term === '') {
        filteredMembers = [...allMembers];
    } else {
        filteredMembers = allMembers.filter(m => 
            (m.name && m.name.toLowerCase().includes(term)) || 
            (m.memberId && m.memberId.toLowerCase().includes(term)) ||
            (m.community && m.community.toLowerCase().includes(term))
        );
    }
    currentPage = 1; 
    displayAdminTable();
});
