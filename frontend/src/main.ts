// main.ts – Startpunkt des Frontends: Vue-App erzeugen und in <div id="app"> einhängen.
import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";

createApp(App).mount("#app");
