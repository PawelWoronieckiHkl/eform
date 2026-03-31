import { showToast } from "../components/toast.js";


export async function getUid() {
  try {
    const response = await fetch(`/user/uid`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`❌ UID Fetch Error: HTTP ${response.status}`);
      return generateFallbackUid();
    }

    const result = await response.json();
    console.log('📦 getUid response:', result);

    if (result.success && result.uid) {
      console.log('✅ UID obtained:', result.uid);
      return result.uid;
    }
    else {
      console.error('❌ getUid failed:', result.message);
      showToast('error', result.message);
      return generateFallbackUid();
    }
  }
  catch (error) {
    console.error('❌ getUid catch error:', error);
    showToast('error', error.message || 'Błąd pobierania UID');
    return generateFallbackUid();
  }
}

function generateFallbackUid() {
  // Generate temporary UID if fetch fails
  const fallbackUid = `uid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.warn('⚠️ Using fallback UID:', fallbackUid);
  return fallbackUid;
}