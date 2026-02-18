
export async function get(url) {
    if (!url) {
        throw new Error("URL is required for GET request.");
    }

    return fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        return response.json();
    });
}

export async function post(url, data) {
    if (!url) {
        throw new Error("URL is required for POST request.");
    }

    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        return response.json();
    });
}

export async function put(url, data) {
    if (!url) {
        throw new Error("URL is required for PUT request.");
    }

    return fetch(url, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        return response.json();
    });
}

export async function del(url) {
    if (!url) {
        throw new Error("URL is required for DELETE request.");
    }

    return fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        return response.json();
    });
}

export async function patch(url, data) {
    if (!url) {
        throw new Error("URL is required for PATCH request.");
    }

    return fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }).then(response => {
        if (!response.ok) {
            throw new Error(`Network error: ${response.statusText}`);
        }
        return response.json();
    });
}