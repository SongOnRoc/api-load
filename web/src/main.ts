import App from "@/App.vue";
import "@/assets/style.css";
import router from "@/router";
import i18n from "@/locales";
import naive from "naive-ui";
import { createPinia } from "pinia";
import { createApp } from "vue";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(naive);
app.use(i18n);
app.mount("#app");
