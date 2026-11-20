<script setup>
defineProps({ name: String, size: { type: [Number, String], default: 20 } });
const paths = {
  book: 'M4 3h12a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2M7 3v18M12 8h4M12 12h4M3 17h16',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm-1 1 9 7 9-7',
  lock: 'M6 10h12a1 1 0 0 1 1 1v9H5v-9a1 1 0 0 1 1-1Zm2 0V6a4 4 0 0 1 8 0v4M12 14v3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  star: 'm12 2 2.8 6.4L22 9l-5.4 4.7 1.6 7.3-6.2-3.8L5.8 21l1.6-7.3L2 9l7.2-.6Z',
  search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  link: 'm9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 7l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
  leaf: 'M19 3C7 2 2 9 6 15s16 4 13-12ZM5 21 16 8',
};
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] || paths.book" /></svg></template>
