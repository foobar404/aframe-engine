AFRAME.registerComponent("killswitch", {
    schema: {
        controller: { type: "string", default: "" }
    },
    init: function () {
        this.controller = document.querySelector(`#${this.data.controller}`);

        this.controller.addEventListener("bbuttondown", this.killToggle.bind(this));
        this.controller.addEventListener("ybuttondown", this.killToggle.bind(this));
    },
    killToggle: function () {
        console.log("killswitch");
    }
})