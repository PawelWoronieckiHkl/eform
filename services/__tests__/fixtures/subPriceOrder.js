'use strict';

/** Wspólne dane zamówienia z cenami regularnymi i SUB___ do testów spójności. */
const SUB_CENA_VISIBLE = '481';
const SUB_CENA_LOCKED = '450';
const SUB_SUMA_VISIBLE = 390;
const SUB_SUMA_LOCKED = 360;
const REGULAR_CENA = '138.88';
const REGULAR_SUMA = '149.58';

function makeOrderItem(overrides = {}) {
  return {
    id: 1,
    department: 'Rolety',
    group_name: 'Grupa A',
    commision: 'Pozycja 1',
    amount: 2,
    json_parameters_desc: [
      ['MODEL', { param_description: 'Model', option_value: 'H50', row: '1' }],
      ['CENA', { param_description: 'Cena katalogowa [€]', option_value: REGULAR_CENA, row: '2' }],
      ['CENA_RABAT', { param_description: 'Rabat', option_value: '0%', row: '2', locked: true }],
      ['SUMA_BRUTTO', { param_description: 'Suma brutto [€]', option_value: REGULAR_SUMA, row: '2', listsum: true }],
      ['SUB___CENA', { param_description: 'SUB cena [€]', option_value: SUB_CENA_VISIBLE, row: '2', locked: false }],
      ['SUB___CENA_RABAT', { param_description: 'SUB rabat [€]', option_value: SUB_CENA_LOCKED, row: '2', locked: true }],
      ['SUB___SUMA_BRUTTO', { param_description: 'SUB suma [€]', option_value: SUB_SUMA_VISIBLE, row: '2', listsum: true, locked: false }],
      ['SUB___SUMA_BRUTTO_LOCKED', { param_description: 'SUB suma ukryta [€]', option_value: SUB_SUMA_LOCKED, row: '2', listsum: true, locked: true }]
    ],
    ...overrides
  };
}

function makeLegacyOrderItem() {
  return {
    id: 2,
    department: 'Rolety',
    group_name: 'Grupa A',
    commision: 'Stare zamówienie',
    json_parameters_desc: [
      ['MODEL', { param_description: 'Model', option_value: 'VS1', row: '1' }],
      ['CENA', { param_description: 'Cena [€]', option_value: '200', row: '2' }],
      ['SUMA_BRUTTO', { param_description: 'Suma [€]', option_value: '200', row: '2', listsum: true }]
    ]
  };
}

function mockReq(userOverrides = {}, contextUser = null) {
  return {
    session: {
      user: {
        orgId: 42,
        isOwner: false,
        isAdmin: false,
        isEmployee: false,
        isGroup: false,
        isGroupShop: false,
        showSubParams: false,
        ...userOverrides
      },
      context_user: contextUser
    }
  };
}

module.exports = {
  SUB_CENA_VISIBLE,
  SUB_CENA_LOCKED,
  SUB_SUMA_VISIBLE,
  SUB_SUMA_LOCKED,
  REGULAR_CENA,
  REGULAR_SUMA,
  makeOrderItem,
  makeLegacyOrderItem,
  mockReq
};
