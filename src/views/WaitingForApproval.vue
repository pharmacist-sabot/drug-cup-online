<!-- src/views/WaitingForApproval.vue -->
<template>
  <div class="wrapper">
    <div class="card content-card">
      <div class="header">
        <i class="fas fa-envelope-open-text icon-success"></i>
        <h1>ยืนยันอีเมลสำเร็จ!</h1>
      </div>
      <p class="message">
        ขอบคุณสำหรับการยืนยันอีเมล บัญชีของคุณถูกสร้างเรียบร้อยแล้ว และกำลังรอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ
      </p>
      <p class="sub-message">
        คุณจะสามารถเข้าสู่ระบบได้หลังจากที่บัญชีของคุณได้รับการอนุมัติ
      </p>
      <div class="actions">
        <router-link to="/login" class="btn btn-primary">กลับไปหน้าเข้าสู่ระบบ</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #F5F1FF 0%, #E6F7FF 100%);
  padding: 1rem;
}
.content-card {
  max-width: 500px;
  width: 100%;
  text-align: center;
  padding: 2.5rem;
  border: none;
  box-shadow: var(--box-shadow-lg);
  animation: fade-in 0.5s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.header {
  margin-bottom: 1.5rem;
}
.icon-success {
  font-size: 4rem;
  color: #28a745; 
  margin-bottom: 1rem;
}
h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color);
  border: none;
  padding: 0;
  margin: 0;
}
.message {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 1rem;
}
.sub-message {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
}
.actions {
  margin-top: 1.5rem;
}
.actions .btn {
  width: 100%;
  padding: 0.75rem;
}
</style>