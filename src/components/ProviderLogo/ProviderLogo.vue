<template>
  <img
    v-if="src"
    class="provider-logo"
    :src="src"
    alt=""
    aria-hidden="true"
    :style="logoStyle"
    decoding="async"
    draggable="false"
  >
  <span v-else class="provider-logo-fallback" :style="logoStyle">{{ provider.slice(0, 1).toUpperCase() }}</span>
</template>

<script>
import { getProviderLogo } from '@/constants/providerLogos'

export default {
  name: 'ProviderLogo',
  props: {
    provider: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      default: 22
    }
  },
  computed: {
    src () {
      return getProviderLogo(this.provider)
    },
    logoStyle () {
      const size = `${this.size}px`
      return { width: size, height: size }
    }
  }
}
</script>

<style scoped>
.provider-logo {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center;
  user-select: none;
}
.provider-logo-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #0f766e;
  color: #fff;
  font-weight: 700;
}
</style>
