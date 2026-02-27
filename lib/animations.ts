/**
 * Animation configuration and utilities for storefront premium redesign
 * Uses Framer Motion for smooth animations
 */

import type { AnimationConfig } from '@/types'

export const ANIMATION_CONFIG: AnimationConfig = {
  pageTransition: { duration: 300, easing: 'ease-out' },
  fadeIn: { duration: 200, delay: 0, easing: 'ease-in' },
  staggerChildren: { delayBetween: 50, duration: 200 },
  cardHover: { scale: 1.02, duration: 200, easing: 'ease-out' },
  imageHover: { scale: 1.05, duration: 300, easing: 'ease-out' },
  tabSlide: { duration: 200, easing: 'ease-in-out' },
}

export const fadeInVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: ANIMATION_CONFIG.fadeIn.duration / 1000,
      ease: ANIMATION_CONFIG.fadeIn.easing,
    },
  },
}

export const fadeInUpVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_CONFIG.fadeIn.duration / 1000,
      ease: ANIMATION_CONFIG.fadeIn.easing,
    },
  },
}

export const staggerContainerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: ANIMATION_CONFIG.staggerChildren.delayBetween / 1000,
    },
  },
}

export const staggerItemVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_CONFIG.staggerChildren.duration / 1000,
    },
  },
}

export const slideDownVariant = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: ANIMATION_CONFIG.pageTransition.duration / 1000,
      ease: ANIMATION_CONFIG.pageTransition.easing,
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      duration: ANIMATION_CONFIG.pageTransition.duration / 1000,
      ease: ANIMATION_CONFIG.pageTransition.easing,
    },
  },
}

export const scaleOnHoverVariant = {
  rest: { scale: 1 },
  hover: {
    scale: ANIMATION_CONFIG.cardHover.scale,
    transition: {
      duration: ANIMATION_CONFIG.cardHover.duration / 1000,
      ease: ANIMATION_CONFIG.cardHover.easing,
    },
  },
}

export const imageScaleVariant = {
  rest: { scale: 1 },
  hover: {
    scale: ANIMATION_CONFIG.imageHover.scale,
    transition: {
      duration: ANIMATION_CONFIG.imageHover.duration / 1000,
      ease: ANIMATION_CONFIG.imageHover.easing,
    },
  },
}

export const buttonPressVariant = {
  rest: { scale: 1 },
  pressed: {
    scale: 0.98,
    transition: { duration: 0.1, ease: 'ease-in' },
  },
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getAnimationDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAccessibleVariant(variant: any): any {
  if (prefersReducedMotion()) {
    return {
      ...variant,
      visible: {
        ...variant.visible,
        transition: { duration: 0 },
      },
    }
  }
  return variant
}
