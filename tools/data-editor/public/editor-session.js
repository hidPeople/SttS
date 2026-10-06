/** Read navigation and completed writes share models, never a mutable "active file" request. */
export class EditorSession {
    models = new Map();
    revision = 0;
    remember(model) { this.models.set(model.file, model); return model; }
    async read(file, fetchModel) {
        if (this.models.has(file)) return this.models.get(file);
        const result = await fetchModel(file);
        // A save may have completed while this older read was in flight.
        if (!this.models.has(file)) this.remember(result);
        return this.models.get(file);
    }
    navigate() { return ++this.revision; }
    current(revision) { return revision === this.revision; }
}
