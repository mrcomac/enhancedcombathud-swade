export function capitalize_first_letter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function remove_tags(text) {
    return text.replace(/<[^>]*>?/gm, '') 
}