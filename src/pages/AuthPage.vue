<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppIcon from '../components/AppIcon.vue';
import NotebookArt from '../components/NotebookArt.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isRegister = computed(() => route.path === '/register');
const name = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const guide = ref(null);
const guideButton = ref(null);
function closeGuide() { guide.value.close(); guideButton.value?.focus(); }
watch(isRegister, async () => {
  name.value = ''; email.value = ''; password.value = ''; error.value = ''; showPassword.value = false;
  await nextTick();
  document.getElementById('auth-heading')?.focus({ preventScroll: true });
});
async function submit() {
  if (loading.value) return;
  error.value = ''; loading.value = true;
  try {
    await auth.authenticate(isRegister.value ? 'register' : 'login', { name: name.value.trim(), email: email.value.trim(), password: password.value });
    password.value = '';
    const target = route.query.redirect;
    await router.replace(typeof target === 'string' && /^\/(?!\/)/.test(target) ? target : '/books');
  } catch (err) { error.value = err.message; }
  finally { loading.value = false; }
}
</script>

<template>
  <div class="auth-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/login" aria-label="TabBook home"><span class="brand-icon"><AppIcon name="book" :size="25" /></span>TabBook<span class="brand-period">.</span></RouterLink>
      <nav aria-label="Main navigation"><span class="header-tagline">Your curiosity, collected.</span><button ref="guideButton" class="text-button guide-link" @click="guide.showModal()">How it works <span>?</span></button></nav>
    </header>

    <main class="auth-main">
      <section class="story-panel" aria-labelledby="story-heading">
        <div class="story-copy"><div class="eyebrow"><span></span> A LITTLE LESS CLUTTER. A LITTLE MORE CLARITY.</div><h1 id="story-heading">Big ideas.<br />Too many tabs.<br /><em>One happy place.</em></h1><p>Turn your open tabs into a collection of possibilities.<br class="desktop-break" /> Your very own study scrapbook, one link at a time.</p></div>
        <NotebookArt />
        <div class="story-footnote"><span class="mini-star">✧</span> For the endlessly curious & the beautifully organized.</div>
      </section>

      <section class="form-panel" aria-labelledby="auth-heading">
        <div class="form-content">
          <div class="form-book"><AppIcon name="book" :size="29" /><span>✦</span></div>
          <p class="form-kicker">{{ isRegister ? 'A FRESH PAGE AWAITS' : 'YOUR NEXT CHAPTER STARTS HERE' }}</p>
          <h2 id="auth-heading" tabindex="-1">{{ isRegister ? 'Make room for curiosity.' : 'Welcome back, learner.' }}</h2>
          <p class="form-description">{{ isRegister ? 'A little space for everything you want to learn.' : 'Your ideas missed you. Let’s pick up where you left off.' }}</p>

          <form @submit.prevent="submit" class="auth-form" :aria-busy="loading">
            <div v-if="isRegister" class="form-field"><label for="name">Your name</label><div class="input-wrap"><AppIcon name="user" /><input id="name" v-model="name" placeholder="What should we call you?" autocomplete="name" required minlength="2" maxlength="80" :disabled="loading" /></div></div>
            <div class="form-field"><label for="email">Email address</label><div class="input-wrap"><AppIcon name="mail" /><input id="email" v-model="email" type="email" placeholder="you@example.com" autocomplete="email" required maxlength="254" :disabled="loading" /></div></div>
            <div class="form-field"><label for="password">Password</label><div class="input-wrap"><AppIcon name="lock" /><input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" :placeholder="isRegister ? 'Create a password' : 'Enter your password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" required :minlength="isRegister ? 8 : undefined" :disabled="loading" :aria-describedby="isRegister ? 'password-hint' : undefined" /><button class="password-toggle" type="button" :aria-label="showPassword ? 'Hide password' : 'Show password'" :aria-pressed="showPassword" @click="showPassword = !showPassword"><AppIcon name="eye" :size="19" /><span v-if="showPassword" class="eye-slash"></span></button></div><p id="password-hint" class="field-hint" v-if="isRegister">At least 8 characters. Make it a good one.</p></div>
            <p v-if="error" class="form-error" role="alert">{{ error }}</p>
            <button class="primary-button" type="submit" :disabled="loading">{{ loading ? 'Opening your notebook…' : isRegister ? 'Create my account' : 'Open my notebook' }}<AppIcon v-if="!loading" name="book" :size="19" /><span v-else class="spinner"></span></button>
          </form>

          <p class="switch-auth">{{ isRegister ? 'Already have a little corner here?' : 'New to this little corner of the internet?' }}<br /><RouterLink :to="{ path: isRegister ? '/login' : '/register', query: route.query }">{{ isRegister ? 'Log in to TabBook' : 'Create a free account' }}</RouterLink><span class="hand-star">✧</span></p>
          <div class="form-divider"></div>
          <div class="privacy-note"><AppIcon name="lock" :size="16" /><p>Your books. Your links. Your little world.<br /><span>A private space, just for you.</span></p></div>
        </div>
        <div class="corner-note">good things start with a little curiosity <span>♡</span></div>
      </section>
    </main>

    <footer class="site-footer"><span>© {{ new Date().getFullYear() }} TabBook</span><span>Made for learning. Designed for a calmer mind. <AppIcon name="leaf" :size="16" /></span><span class="footer-label">CLOSE TABS. OPEN POSSIBILITIES.</span></footer>

    <dialog ref="guide" class="guide-dialog" @click="($event.target === guide) && closeGuide()" @cancel.prevent="closeGuide()" aria-labelledby="guide-heading">
      <button class="dialog-close" aria-label="Close guide" @click="closeGuide()"><AppIcon name="close" /></button><span class="guide-badge"><AppIcon name="book" :size="28" /></span><p class="form-kicker">YOUR CURIOSITY HAS A HOME</p><h2 id="guide-heading">A notebook for your internet.</h2><p>TabBook is growing into a personal scrapbook for everything you’re learning.</p><ol><li><b>Name your book.</b><span>Give each interest a home, like “Learning Japanese”.</span></li><li><b>Make it your own.</b><span>Add sections with your own names, like “Grammar” or “Listening”.</span></li><li><b>Collect the good stuff.</b><span>Keep the articles, videos, and links you choose in their sections.</span></li></ol><p class="guide-status">We’re starting with accounts. Books and saved tabs are coming next.</p><button class="primary-button" @click="closeGuide()">Sounds lovely <AppIcon name="check" :size="18" /></button>
    </dialog>
  </div>
</template>
