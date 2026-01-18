import { Card } from '@/types';

export const mockCards: Card[] = [
  {
    id: '1',
    type: 'virtual',
    lastFour: '4532',
    cardholderName: '',
    expiryDate: '12/27',
    isFrozen: false,
    color: '#9DC183',
  },
  {
    id: '2',
    type: 'physical',
    lastFour: '8721',
    cardholderName: '',
    expiryDate: '08/28',
    isFrozen: false,
    color: '#7BA05B',
  },
  {
    id: '3',
    type: 'virtual',
    lastFour: '1095',
    cardholderName: '',
    expiryDate: '03/29',
    isFrozen: true,
    color: '#6B8E4E',
  },
];
