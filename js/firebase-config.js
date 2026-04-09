import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDMMwciq6QoLSaWK6xfdr0U3ynyahtoaSk",
    authDomain: "studio-a33fe.firebaseapp.com",
    databaseURL: "https://studio-a33fe-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "studio-a33fe",
    storageBucket: "studio-a33fe.firebasestorage.app",
    messagingSenderId: "753539109404",
    appId: "1:753539109404:web:4da4ddfb9410a93ce645d9",
    measurementId: "G-YH6785ME27"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);