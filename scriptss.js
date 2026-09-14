function setActive1(button) {
    document.querySelectorAll(".icon").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
}