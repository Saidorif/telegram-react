// ...existing code...

renderPollOptionContent(option) {
    const { text, entities } = option.text;
    // Format the text content properly
    return (
        <div>
            {text}
            {entities && entities.map((entity, index) => (
                <span key={index}>{entity.text}</span>
            ))}
        </div>
    );
}

// ...existing code...

render() {
    const { option } = this.props;

    return (
        <div className="poll-option">
            {this.renderPollOptionContent(option)}
        </div>
    );
}

// ...existing code...
