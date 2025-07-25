class CircularSlider {
  constructor(options) {
    this.container = options.container;
    this.color = options.color || "#000";
    this.min = options.min || 0;
    this.max = options.max || 100;
    this.step = options.step || 1;
    this.radius = options.radius;
    this.value = this.min;
    this.angle = -Math.PI / 2;

    this._boundOnDrag = this.onDrag.bind(this);
    this._boundStopDrag = this.stopDrag.bind(this);

    this.containerRect = this.container.getBoundingClientRect();
    
    // Create or reuse shared SVG
    this.svg = this.getOrCreateSVG(this.container);
    this.svgRect = this.svg.getBoundingClientRect();

    // Create or reuse value container
    this.valueContainer = this.getOrCreateValueContainer(this.container);


    // Create and add value display to value container
    this.valueDisplay = document.createElement('div');
    this.valueDisplay.style.fontFamily = 'Arial, sans-serif';
    this.valueDisplay.style.fontSize = '3rem';
    this.valueDisplay.style.fontWeight = 'bold';
    this.valueDisplay.style.color = this.color;
    this.valueDisplay.style.marginBottom = '5px';

    // Compute how many chars the max number needs
    const maxChars = options.max.toString().length;

    // Set width in 'ch' units based on maxChars + a bit of padding
    const widthCh = maxChars + 1; // +1 for some breathing room

    // When creating value display element, set its width:
    this.valueDisplay.style.width = `${widthCh}ch`;
    this.valueDisplay.style.textAlign = 'center'; // or center if you prefer

    this.valueDisplay.innerText = this.value;
    this.valueContainer.appendChild(this.valueDisplay);

    this.createSliderGroup();
  }

  getOrCreateValueContainer(container) {
    let valueDiv = container.querySelector(".value-display-container");
    if (!valueDiv) {
      valueDiv = document.createElement("div");
      valueDiv.classList.add("value-display-container");
      valueDiv.style.display = "flex";
      valueDiv.style.flexWrap = "wrap";
      valueDiv.style.justifyContent = "center";
      valueDiv.style.gap = "2.5rem";
      valueDiv.style.marginTop = "0.5rem";
      container.appendChild(valueDiv);
    }
    return valueDiv;
  }

  getOrCreateSVG(container) {
    let svg = container.querySelector("svg");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const size = Math.min(this.containerRect.width, this.containerRect.height); // fallback to 320 if zero

      // Use a square viewBox based on current container size
      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

      // Set width and height to 100% so it scales with container
      svg.setAttribute("width", "100%");
      // svg.setAttribute("height", "90vh");

      container.appendChild(svg);
    } else {
      const size = Math.min(this.containerRect.width, this.containerRect.height);
      svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    }
    return svg;
  }

  createSliderGroup() {
    const svgNS = "http://www.w3.org/2000/svg";
    const size = Math.min(this.containerRect.width, this.containerRect.height);
    const cx = size / 2;
    const cy = size / 2;
    this.center = { x: cx, y: cy };

    this.group = document.createElementNS(svgNS, "g");
    this.svg.appendChild(this.group);

    const uniqueId = `slider-${Math.random().toString(36).substring(2, 10)}`;
    const gradientId = `trackGradient-${uniqueId}`;
    const filterId = `glow-${uniqueId}`;

    const defs = document.createElementNS(svgNS, "defs");

    const gradient = document.createElementNS(svgNS, "linearGradient");
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("x1", "0%");
    gradient.setAttribute("y1", "0%");
    gradient.setAttribute("x2", "100%");
    gradient.setAttribute("y2", "100%");

    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "#eee");
    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#ccc");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", filterId);
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");

    const feDropShadow = document.createElementNS(svgNS, "feDropShadow");
    feDropShadow.setAttribute("dx", "0");
    feDropShadow.setAttribute("dy", "0");
    feDropShadow.setAttribute("stdDeviation", "3");
    feDropShadow.setAttribute("flood-color", "#bbb");
    feDropShadow.setAttribute("flood-opacity", "0.4");

    filter.appendChild(feDropShadow);
    defs.appendChild(filter);

    this.svg.appendChild(defs);

    const strokeWidth = Math.max(6, Math.min(this.container.offsetWidth * 0.03, this.container.offsetHeight * 0.03, 25)); 

    this.track = document.createElementNS(svgNS, "circle");
    this.track.setAttribute("cx", cx);
    this.track.setAttribute("cy", cy);
    this.track.setAttribute("r", this.radius);
    this.track.setAttribute("fill", "none");
    this.track.setAttribute("stroke", `url(#${gradientId})`);
    this.track.setAttribute("stroke-width", strokeWidth);
    this.track.setAttribute("filter", `url(#${filterId})`);
    this.group.appendChild(this.track);

    this.arc = document.createElementNS(svgNS, "path");
    this.arc.setAttribute("fill", "none");
    this.arc.setAttribute("stroke", this.color);
    this.arc.setAttribute("stroke-width", strokeWidth);
    this.arc.setAttribute("stroke-opacity", "0.7");
    this.group.appendChild(this.arc);

    this.handle = document.createElementNS(svgNS, "circle");
    const handleSize = Math.max(8, Math.min(this.container.offsetWidth * 0.03, this.container.offsetHeight * 0.03, 30)); 
    this.handle.setAttribute("r", handleSize);
    this.handle.setAttribute("fill", this.color);
    this.handle.classList.add("handle");
    this.group.appendChild(this.handle);


    this.updateHandlePosition(this.value);

    this.handle.addEventListener("mousedown", (e) => this.startDrag(e));
    this.handle.addEventListener("touchstart", (e) => this.startDrag(e), { passive: false });
    this.track.addEventListener("click", (e) => this.handleClick(e));
    this.arc.addEventListener("click", (e) => this.handleClick(e));
  }

  startDrag(e) {
    e.preventDefault();
    document.addEventListener("mousemove", this._boundOnDrag);
    document.addEventListener("mouseup", this._boundStopDrag);
    document.addEventListener("touchmove", this._boundOnDrag, { passive: false });
    document.addEventListener("touchend", this._boundStopDrag);
  }

  onDrag(e) {
    e.preventDefault();
    this.angle = this.getAngleFromEvent(e);
    this.value = this.angleToValue(this.angle);
    this.updateHandlePosition(this.value);
  }

  stopDrag() {
    document.removeEventListener("mousemove", this._boundOnDrag);
    document.removeEventListener("mouseup", this._boundStopDrag);
    document.removeEventListener("touchmove", this._boundOnDrag);
    document.removeEventListener("touchend", this._boundStopDrag);
  }

  handleClick(e) {
    this.angle = this.getAngleFromEvent(e);
    this.value = this.angleToValue(this.angle);
    this.updateHandlePosition(this.value);
  }

  updateHandlePosition(value) {
    const angle = ((value - this.min) / (this.max - this.min)) * 2 * Math.PI;
    const adjustedAngle = angle - (Math.PI / 2);
    const x = this.center.x + (this.radius * Math.cos(adjustedAngle));
    const y = this.center.y + (this.radius * Math.sin(adjustedAngle));
    this.handle.setAttribute("cx", x);
    this.handle.setAttribute("cy", y);
    this.updateArc(value);
    this.valueDisplay.innerText = value;
  }

  updateArc(value) {
  const range = this.max - this.min;
  const progress = (value - this.min) / range;
  const r = this.radius;
  const cx = this.center.x;
  const cy = this.center.y;

  if (progress >= 1) {
    // Special case: full circle using two 180° arcs
    const d = [
      "M", cx + r, cy,
      "A", r, r, 0, 1, 1, cx - r, cy,
      "A", r, r, 0, 1, 1, cx + r, cy
    ].join(" ");
    this.arc.setAttribute("d", d);
    return;
  }

  if (progress <= 0) {
    this.arc.setAttribute("d", "");
    return;
  }

  const startAngle = 0;
  const endAngle = progress * 360;

  const start = this.polarToCartesian(cx, cy, r, endAngle);
  const end = this.polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const d = [
    "M", end.x, end.y,
    "A", r, r, 0, largeArc, 1, start.x, start.y
  ].join(" ");

  this.arc.setAttribute("d", d);
}

  getAngleFromEvent(e) {
  const pt = this.svg.createSVGPoint();
  pt.x = e.touches ? e.touches[0].clientX : e.clientX;
  pt.y = e.touches ? e.touches[0].clientY : e.clientY;

  const svgP = pt.matrixTransform(this.svg.getScreenCTM().inverse());

  const dx = svgP.x - this.center.x;
  const dy = svgP.y - this.center.y;

  return Math.atan2(dy, dx);
}

  angleToValue(angle) {
    const degrees = (angle * 180) / Math.PI;
    const normalized = (degrees + 360 + 90) % 360;
    const range = this.max - this.min;
    const raw = (normalized / 360) * range + this.min;
    return Math.round(raw / this.step) * this.step;
  }

  polarToCartesian(cx, cy, r, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: cx + (r * Math.cos(angleInRadians)),
      y: cy + (r * Math.sin(angleInRadians)),
    };
  }
}


