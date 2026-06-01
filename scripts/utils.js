export function capitalize_first_letter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function remove_tags(text) {
    if(typeof text === "string")
        return text.replace(/<[^>]*>?/gm, '')
    else if (text?.name)
        return game.i18n.localize(text.name)
    return ""
}