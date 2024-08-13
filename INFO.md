In the examples, he's supplying a uniform resolution to normalize the data then map them into clip space [-1, 1]

What do i want?
Q: I want my shader to take resoltuion rather than floating points.
A: vec2 zeroToOne = a_position / u_resolution;

Q: I want my shader to start top left, just like raylib.
A: gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);