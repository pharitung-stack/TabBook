<script setup>
import AppIcon from './AppIcon.vue';
</script>
<template>
  <div class="scrapbook" role="img" aria-label="An illustrated study notebook with personally named sections for design, coding, and little curiosities.">
    <div class="tiny-spark spark-one">✳</div>
    <div class="tiny-spark spark-two">✧</div>
    <div class="hand-note">a place for every<br />“I’ll read this later” <span>⌁</span></div>
    <div class="paper-back"></div>
    <div class="notebook">
      <div class="tape tape-top"></div>
      <div class="notebook-tabs"><span>design</span><span>coding</span><span>curious</span></div>
      <div class="binding"><i v-for="n in 7" :key="n"></i></div>
      <div class="notebook-content">
        <div class="notebook-overline">MY LITTLE COLLECTION</div>
        <h3>Things I’m<br />learning<span>✦</span></h3>
        <div class="notebook-rule"></div>
        <div class="resource resource-pink"><span class="resource-icon">Aa</span><div><b>A little design inspiration</b><small>Article · 8 min read</small></div><AppIcon name="link" :size="15" /></div>
        <div class="resource resource-lilac"><span class="resource-icon code-icon">&lt;/&gt;</span><div><b>One more coding rabbit hole</b><small>Documentation</small></div><AppIcon name="link" :size="15" /></div>
        <div class="resource resource-yellow"><span class="resource-icon">▷</span><div><b>Something worth watching</b><small>Video · Watch later</small></div><AppIcon name="link" :size="15" /></div>
        <div class="notebook-bottom"><span>collected with curiosity</span><AppIcon name="leaf" :size="25" /></div>
      </div>
      <div class="bookmark-ribbon"></div>
    </div>
    <div class="saved-sticker"><span><AppIcon name="check" :size="17" /></span>Saved for a curious day.</div>
    <div class="flower"><div v-for="n in 5" :key="n" :style="{ transform: `rotate(${n * 72}deg) translateY(-13px)` }"></div><i></i></div>
    <div class="bottom-note">less tab chaos, more aha moments.</div>
  </div>
</template>
