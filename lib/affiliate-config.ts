export type AffiliatePlatform = 'amazon' | 'flipkart' | 'myntra' | 'ajio' | 'nykaa' | 'meesho'

export interface AffiliatePlatformConfig {
  name: string
  domains: string[]
  commissionRange: string
  tagParam?: string
  tagValue?: string
  subTagParam?: string
  idParam?: string
  idValue?: string
}

export const AFFILIATE_PLATFORMS: Record<AffiliatePlatform, AffiliatePlatformConfig> = {
  amazon: {
    name: 'Amazon',
    domains: ['amazon.in', 'amzn.in'],
    commissionRange: '1%-10%',
    tagParam: 'tag',
    tagValue: process.env.AMAZON_AFFILIATE_TAG || 'linkmystore-21',
    subTagParam: 'ascsubtag',
  },
  flipkart: {
    name: 'Flipkart',
    domains: ['flipkart.com', 'fkrt.it'],
    commissionRange: '1%-12%',
    idParam: 'affid',
    idValue: process.env.FLIPKART_AFFILIATE_ID || 'linkmystore',
    subTagParam: 'SID',
  },
  myntra: {
    name: 'Myntra',
    domains: ['myntra.com'],
    commissionRange: '2%-8%',
  },
  ajio: {
    name: 'Ajio',
    domains: ['ajio.com'],
    commissionRange: '3%-10%',
  },
  nykaa: {
    name: 'Nykaa',
    domains: ['nykaa.com'],
    commissionRange: '5%-15%',
  },
  meesho: {
    name: 'Meesho',
    domains: ['meesho.com'],
    commissionRange: '1%-5%',
  },
}
