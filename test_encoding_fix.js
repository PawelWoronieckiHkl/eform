#!/usr/bin/env node

/**
 * Test script dla funkcji naprawy kodowania znaków
 * Uruchom: node test_encoding_fix.js
 */

const { fixCharacterEncoding } = require('./services/dbUserSync');

async function testEncodingFix() {
    console.log('🚀 Rozpoczynam test naprawy kodowania znaków...\n');

    try {
        await fixCharacterEncoding();
        console.log('\n✅ Test zakończony pomyślnie!');
    } catch (error) {
        console.error('\n❌ Błąd podczas testu:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Uruchom test
testEncodingFix();