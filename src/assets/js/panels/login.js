/**
 * @autor Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */
const { Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";
    async init(config) {
        this.config = config;
        this.db = new database();

        this.getCrack();
    }

    async getCrack() {
        console.log('กำลังเริ่มการเข้าสู่ระบบแบบออฟไลน์...');
        let popupLogin = new popup();
        let loginOffline = document.querySelector('.login-offline');

        let emailOffline = document.querySelector('.email-offline');
        let passwordOffline = document.querySelector('.password-offline');
        let connectOffline = document.querySelector('.connect-offline');
        loginOffline.style.display = 'block';

        connectOffline.addEventListener('click', async () => {
            if (emailOffline.value.length < 3) {
                popupLogin.openPopup({
                    title: 'ข้อผิดพลาด',
                    content: 'ชื่อผู้ใช้ของคุณต้องมีความยาวอย่างน้อย 3 ตัวอักษร',
                    options: true
                });
                return;
            }

            if (emailOffline.value.match(/ /g)) {
                popupLogin.openPopup({
                    title: 'ข้อผิดพลาด',
                    content: 'ชื่อผู้ใช้ของคุณต้องไม่มีช่องว่าง',
                    options: true
                });
                return;
            }

            if (passwordOffline.value.length < 3) {
                popupLogin.openPopup({
                    title: 'ข้อผิดพลาด',
                    content: 'รหัสผ่านของคุณต้องมีความยาวอย่างน้อย 3 ตัวอักษร',
                    options: true
                });
                return;
            }

            try {
                let response = await fetch('https://juimui.fun/launcher_backend/login.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Launcher': '1'
                    },
                    body: JSON.stringify({
                        username: emailOffline.value,
                        password: passwordOffline.value
                    })
                });

                let result = await response.json();

                if (result.status !== 'success') {
                    popupLogin.openPopup({
                        title: 'ข้อผิดพลาด',
                        content: 'การเข้าสู่ระบบล้มเหลว',
                        options: true
                    });
                    return;
                }

                let MojangConnect = await Mojang.login(emailOffline.value);

                if (MojangConnect.error) {
                    popupLogin.openPopup({
                        title: 'ข้อผิดพลาด',
                        content: MojangConnect.message,
                        options: true
                    });
                    return;
                }

                await this.saveData(MojangConnect);
                popupLogin.closePopup();
            } catch (error) {
                popupLogin.openPopup({
                    title: 'ข้อผิดพลาด',
                    content: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์',
                    options: true
                });
            }
        });
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let accountsList = await this.db.readAllData('accounts'); // <-- ดึง accounts ทั้งหมด
        let existingAccount = accountsList.find(acc => acc.uuid === connectionData.uuid);
    
        let account;
        if (existingAccount) {
            // ถ้ามี account อยู่แล้ว ไม่ต้องเพิ่มใหม่
            account = existingAccount;
        } else {
            // ถ้ายังไม่มี ให้เพิ่มบัญชีใหม่
            account = await this.db.createData('accounts', connectionData);
            await addAccount(account); // <-- เพิ่มแค่ครั้งแรกที่พบว่าไม่มี
        }
    
        let instanceSelect = configClient.instance_selct;
        let instancesList = await config.getInstanceList();
    
        configClient.account_selected = account.ID;
    
        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == account.name);
                if (whitelist !== account.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false);
                        configClient.instance_selct = newInstanceSelect.name;
                        await setStatus(newInstanceSelect.status);
                    }
                }
            }
        }
    
        await this.db.updateData('configClient', configClient);
        await accountSelect(account);
        changePanel('home');
    }
}
export default Login;