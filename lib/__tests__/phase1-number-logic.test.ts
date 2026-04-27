import {
  FREE_PRODUCT_LIMIT,
  PLAN_FEATURES,
  PRO_PLAN_PRICE,
  PRO_PLAN_TERM_PRICING,
  calculatePlatformFee,
} from '@/lib/constants'

describe('phase 1 numeric rules', () => {
  it('keeps free tier product cap at 5 and pro pricing at INR 299', () => {
    expect(FREE_PRODUCT_LIMIT).toBe(5)
    expect(PLAN_FEATURES.free.maxProducts).toBe(5)
    expect(PRO_PLAN_PRICE).toBe(29900)
    expect(PRO_PLAN_TERM_PRICING[3].amount).toBe(80700)
    expect(PRO_PLAN_TERM_PRICING[6].amount).toBe(152500)
    expect(PRO_PLAN_TERM_PRICING[12].amount).toBe(287000)
  })

  it('computes platform fee from paisa accurately', () => {
    expect(calculatePlatformFee(10000)).toBe(400) // 4%
    expect(calculatePlatformFee(19900)).toBe(796)
  })
})
