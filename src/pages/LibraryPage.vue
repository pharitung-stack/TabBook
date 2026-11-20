<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppIcon from '../components/AppIcon.vue';
const auth = useAuthStore();
const router = useRouter();
const error = ref('');
const busy = ref(false);
async function logout() {
  error.value = ''; busy.value = true;
  try { await auth.logout(); await router.replace('/login'); }
  catch (err) { error.value = err.message; }
  finally { busy.value = false; }
}
</script>
<template><div class="library-shell"><header class="site-header"><RouterLink class="brand" to="/books"><span class="brand-icon"><AppIcon name="book" :size="25" /></span>TabBook<span class="brand-period">.</span></RouterLink><button class="text-button" :disabled="busy" @click="logout">{{ busy ? 'Signing out…' : 'Sign out' }}</button></header><main class="library-welcome"><div class="welcome-icon"><AppIcon name="book" :size="50" /></div><p class="form-kicker">THIS IS YOUR LITTLE CORNER</p><h1>You’re in, {{ auth.user?.name }}.</h1><p>Your account is ready. This is where your own books,<br />sections, and saved links will live.</p><div class="coming-next"><AppIcon name="leaf" :size="22" /><span><b>A fresh bookshelf is coming next.</b><br />You’ll choose every name, section, and link yourself.</span></div><p class="form-error" role="alert" v-if="error">{{ error }}</p></main></div></template>
