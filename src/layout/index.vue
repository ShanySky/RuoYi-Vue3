<template>
  <div :class="[classObj, { 'ai-docked': aiDocked }]" class="app-wrapper" :style="{ '--current-color': theme, '--current-color-light': theme + '1a', '--current-color-dark-bg': theme + '33', '--ai-dock-width': aiDockWidth + 'px' }">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside"/>
    <sidebar v-if="!sidebar.hide" class="sidebar-container" />
    <div :class="{ hasTagsView: needTagsView, sidebarHide: sidebar.hide }" class="main-container">
      <div :class="{ 'fixed-header': fixedHeader }">
        <navbar @setLayout="setLayout" />
        <tags-view v-if="needTagsView" />
      </div>
      <app-main />
      <settings ref="settingRef" />
    </div>
    <ai-assistant @dock-change="handleAiDockChange" />
  </div>
</template>

<script setup>
import { useWindowSize } from '@vueuse/core'
import Sidebar from './components/Sidebar/index.vue'
import { AppMain, Navbar, Settings, TagsView } from './components'
import AiAssistant from '@/components/AiAssistant/index.vue'
import useAppStore from '@/store/modules/app'
import useSettingsStore from '@/store/modules/settings'

const settingsStore = useSettingsStore()
const theme = computed(() => settingsStore.theme)
const sidebar = computed(() => useAppStore().sidebar)
const device = computed(() => useAppStore().device)
const needTagsView = computed(() => settingsStore.tagsView)
const fixedHeader = computed(() => settingsStore.fixedHeader)
const aiDocked = ref(false)
const aiDockWidth = ref(560)

const classObj = computed(() => ({
  hideSidebar: !sidebar.value.opened,
  openSidebar: sidebar.value.opened,
  withoutAnimation: sidebar.value.withoutAnimation,
  mobile: device.value === 'mobile'
}))

const { width, height } = useWindowSize()
const WIDTH = 992 // refer to Bootstrap's responsive design

watch(() => device.value, () => {
  if (device.value === 'mobile' && sidebar.value.opened) {
    useAppStore().closeSideBar({ withoutAnimation: false })
  }
  if (device.value === 'mobile') aiDocked.value = false
})

watchEffect(() => {
  if (width.value - 1 < WIDTH) {
    useAppStore().toggleDevice('mobile')
    useAppStore().closeSideBar({ withoutAnimation: true })
  } else {
    useAppStore().toggleDevice('desktop')
  }
})

function handleClickOutside() {
  useAppStore().closeSideBar({ withoutAnimation: false })
}

function handleAiDockChange(state) {
  aiDocked.value = !!state?.open && device.value !== 'mobile'
  if (state?.width) aiDockWidth.value = state.width
}

const settingRef = ref(null)
function setLayout() {
  settingRef.value.openSetting()
}
</script>

<style lang="scss" scoped>
@use "@/assets/styles/mixin.scss" as mix;
@use "@/assets/styles/variables.module.scss" as vars;

.app-wrapper {
  @include mix.clearfix;
  position: relative;
  height: 100%;
  width: 100%;

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
  }
}

.main-container {
  transition: margin-left .28s, margin-right .2s ease;
}

.main-container:has(.fixed-header) {
  height: 100vh;
  overflow: hidden;
}

.ai-docked .main-container {
  margin-right: var(--ai-dock-width);
}

.drawer-bg {
  background: #000;
  opacity: 0.3;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - #{vars.$base-sidebar-width});
  transition: width .28s, right .2s ease;
}

.hideSidebar .fixed-header {
  width: calc(100% - 54px);
}

.sidebarHide .fixed-header {
  width: 100%;
}

.ai-docked .fixed-header {
  right: var(--ai-dock-width);
  width: calc(100% - #{vars.$base-sidebar-width} - var(--ai-dock-width));
}

.ai-docked.hideSidebar .fixed-header {
  width: calc(100% - 54px - var(--ai-dock-width));
}

.ai-docked.sidebarHide .fixed-header {
  width: calc(100% - var(--ai-dock-width));
}

.mobile .fixed-header {
  width: 100%;
}

.mobile.ai-docked .main-container {
  margin-right: 0;
}

.mobile.ai-docked .fixed-header {
  right: 0;
  width: 100%;
}
</style>