
**ToolDraw** is a simple Typescript shape-drawing app that lets you draw line segments, circles, and rectangles. There is a toolbar to switch between the tools, and a color picker.

The point of it is not the drawing itself, but the tracking the user actions involved in drawing, from switching tools to drawing shapes to assigning colors.

The good part is all in **telemetry.ts** which has a function you can call from wherever you want to track actions. It also uploads the data in a JSON packet to a host at a sample endpoint **data.example.com/events**.

![screen shot](https://glenn.media/misc/tooldraw_screen.png)
