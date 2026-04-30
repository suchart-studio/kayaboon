import { db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ดึงตัวแปร HTML
const form = document.getElementById('trashForm');
const communitySelect = document.getElementById('communitySelect');
const recordDate = document.getElementById('recordDate');
const saveBtn = document.getElementById('saveBtn');

const inputs = {
    glass: document.getElementById('valGlass'),
    paper: document.getElementById('valPaper'),
    plastic: document.getElementById('valPlastic'),
    metal: document.getElementById('valMetal'),
    other: document.getElementById('valOther')
};

const totalDisplay = document.getElementById('totalDisplay');

// ข้อมูลชุมชนทั้งหมด (สามารถเพิ่ม/ลดได้ที่นี่)
const communityData = {
    "0": ["พนักงานเทศบาล"],
    "1": ["โนนชัย 1", "โนนชัย 2", "โนนชัย 3", "ดอนหญ้านาง 1", "ดอนหญ้านาง 2", "ดอนหญ้านาง 3", "หลังศูนย์ราชการ 1", "หลังศูนย์ราชการ 2", "เทพารักษ์ 1", "เทพารักษ์ 2", "เทพารักษ์ 3", "เทพารักษ์ 4", "เทพารักษ์ 5", "พัฒนาเทพารักษ์", "เจ้าพ่อเกษม", "เจ้าพ่อทองสุข", "บขส"],
    "2": ["หนองใหญ่ 1", "หนองใหญ่ 2", "หนองใหญ่ 3", "หนองใหญ่ 4", "บ้านบะขาม", "ศรีจันทร์ประชา", "นาคะประเวศน์", "คุ้มพระลับ", "ชัยณรงค์-สามัคคี", "ธารทิพย์", "หน้า รพ.ศูนย์", "หลักเมือง", "บ้านเลขที่ 37", "ทุ่งเศรษฐี", "ศิริมงคล", "ศรีจันทร์พัฒนา", "มิตรสัมพันธ์ 1", "มิตรสัมพันธ์ 2", "ทุ่งสร้างพัฒนา", "โพธิบัลลังค์ทอง", "บ้านพัก ตชด", "หัวสะพานสัมพันธ์"],
    // ** ถ้ามีโซน 3, 4 ให้เพิ่มตรงนี้ให้ครบเหมือนใน report.js ของคุณ **
};

// ตั้งค่าเริ่มต้นวันที่เป็นวันปัจจุบัน
const today = new Date().toISOString().split('T')[0];
recordDate.value = today;

// นำรายชื่อชุมชนใส่ลงใน Dropdown
function populateCommunities() {
    let allCommunities = [];
    for (const zone in communityData) {
        allCommunities = allCommunities.concat(communityData[zone]);
    }
    
    // เรียงตามตัวอักษร
    allCommunities.sort();

    allCommunities.forEach(comm => {
        const option = document.createElement('option');
        option.value = comm;
        option.textContent = comm;
        communitySelect.appendChild(option);
    });
}

// คำนวณยอดรวมแบบ Real-time
function calculateTotal() {
    let total = 0;
    Object.values(inputs).forEach(input => {
        total += parseFloat(input.value || 0);
    });
    totalDisplay.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ผูก Event Listener เพื่อคำนวณเวลามีการพิมพ์
Object.values(inputs).forEach(input => {
    input.addEventListener('input', calculateTotal);
});

// จัดการเมื่อกดปุ่มบันทึก
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ป้องกันกดซ้ำ
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ กำลังบันทึก...';

    try {
        const glassVal = parseFloat(inputs.glass.value || 0);
        const paperVal = parseFloat(inputs.paper.value || 0);
        const plasticVal = parseFloat(inputs.plastic.value || 0);
        const metalVal = parseFloat(inputs.metal.value || 0);
        const otherVal = parseFloat(inputs.other.value || 0);
        const totalVal = glassVal + paperVal + plasticVal + metalVal + otherVal;

        // โครงสร้างข้อมูลที่จะบันทึกขึ้น Firestore
        const recordData = {
            date: recordDate.value,
            community: communitySelect.value,
            glass: glassVal,
            paper: paperVal,
            plastic: plasticVal,
            metal: metalVal,
            other: otherVal,
            total: totalVal,
            timestamp: serverTimestamp() // บันทึกเวลาจริงของ Server
        };

        // บันทึกลง Collection ชื่อ "trash_records" (ระบบจะสร้างให้อัตโนมัติถ้ายังไม่มี)
        await addDoc(collection(db, "trash_records"), recordData);

        alert('✅ บันทึกข้อมูลสำเร็จ!');
        
        // ล้างฟอร์มยกเว้นวันที่
        communitySelect.value = '';
        Object.values(inputs).forEach(input => input.value = '');
        calculateTotal();

    } catch (error) {
        console.error("Error adding document: ", error);
        alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } finally {
        // ปลดล็อคปุ่ม
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 บันทึกข้อมูล';
    }
});

// รันฟังก์ชันเมื่อโหลดไฟล์
populateCommunities();