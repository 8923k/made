<template>
  <div class="app-shell">
    <router-view />
  </div>
</template>

<script>
export default {
  name: "App",
};
</script>

<style>
.app-shell {
  width: 100%;
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background: #f7f8fa;
  -webkit-overflow-scrolling: touch;
}
* {
  -webkit-tap-highlight-color: transparent;
}
</style>
