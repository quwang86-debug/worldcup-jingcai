import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { refreshLiveScores } from "./data/liveScores.js";
import "./styles/tokens.css";
import "./styles/base.css";

refreshLiveScores();
setInterval(() => refreshLiveScores(), 5 * 60 * 1000);

createApp(App).use(router).mount("#app");
