import { showToast } from "../components/toast.js";


export async function getUid() {
 try {
    const response = await fetch(`/user/uid`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const result = await response.json();
    // console.log(result,'result uid fetch')
    if (result.success) {
        // console.log(result.uid,'uid')
        return result.uid;
        
    }
    else {
      showToast('error', result.message);
      return null;}
  }
  catch (error) {
    showToast('error', error);
    return null;
  }
}