import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import { useGSAP } from '@gsap/react'
import { bezier } from './easings'

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP)

CustomEase.create('hush', bezier.hush.join(','))
CustomEase.create('exhale', bezier.exhale.join(','))

ScrollTrigger.config({ ignoreMobileResize: true })
// Lenis owns smoothing; GSAP must never "catch up" frames on its own.
gsap.ticker.lagSmoothing(0)

export { gsap, ScrollTrigger, SplitText, useGSAP }
