const ctx = {
    map_w: 820,
    map_h: 720,
    // chart_w: 820,
    // chart_h: 420,
    france_center: [2.5, 46.5],
    stationDataPath: './data/referentiel-gares-voyageurs.geojson',
    frequentationDataPath: './data/frequentation-gares.csv'
}

function createViz() {
    console.log('Using D3 v' + d3.version)
    let svgEl = d3.select('#main').append('svg')
    svgEl.attr('width', ctx.map_w)
    svgEl.attr('height', ctx.map_h)
    svgEl.attr('id', 'map')
    let rootG = svgEl.append('g').attr('id', 'rootG')

    // draw map
    let canvas = rootG.append('g').attr('id', 'canvas')
    loadMap(canvas)
}

function init() {
    let canvas = d3.select("#canvas")
    canvas.selectAll("*").remove()
    loadMap(canvas)
}

function loadMap(canvas) {
    // map projection
    let projection = d3.geoMercator()
        .center(ctx.france_center) // latitude & longitude
        .translate([ctx.map_w / 2, ctx.map_h / 2])
        .scale(2400)

    // path generator
    let path = d3.geoPath()
        .projection(projection)

    let url = 'data/regions.geojson'
    d3.json(url).then((data) => {
        groupStationByRegion(data)

        let tooltip = d3.select("#main")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "Ivory")
            .style("border", "solid 2px DimGray")
            .style("border-radius", "5px")
            .style("padding", "5px")
            .style("position", "absolute")
            .style("color", "#333")

        // binding data and creating one path per GeoJSON feature
        canvas.selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("stroke", "dimgray")
            .attr("fill", "azure")
            .on("click", function (event, d) {
                const elements = document.getElementsByClassName("tooltip")
                while (elements.length > 0) {
                    elements[0].parentNode.removeChild(elements[0]);
                }
                drawRegion(canvas, d)
            })
            .on("mouseover", function (event, d) {
                d3.select(this).style("fill", "#ddd333")
                tooltip.style("opacity", 1)
            })
            .on("mousemove", function (event, d) {
                tooltip
                    .html(d.properties.nom)
                    .style("left", (path.centroid(d)[0] + document.getElementById("main").offsetLeft + "px"))
                    .style("top", (path.centroid(d)[1] + document.getElementById("main").offsetTop) + "px")
            })
            .on("mouseleave", function (event, d) {
                d3.select(this).style("fill", "azure")
                tooltip.style("opacity", 0)
            })


        // canvas.selectAll("text")
        //     .data(data.features)
        //     .enter()
        //     .append("text")
        //     .attr("fill", "darkslategray")
        //     .attr("transform", (d) => { return "translate(" + path.centroid(d) + ")" })
        //     .attr("text-anchor", "middle")
        //     .attr("dy", ".35em")
        //     .text((d) => {
        //         return d.properties.nom
        //     })

        // // append the name
        // canvas.append("text")
        //     .attr("x", 0)
        //     .attr("y", 340)
        //     .attr("font-size", 90)
        //     .attr("font-weight", "bold")
        //     .attr("font-family", "Times New Roman")
        //     .attr("text-anchor", "middle")
        //     .attr("opacity", 0.5)

        loadStation(projection, canvas)
    }).catch(function (error) { console.log(error) })
}

function groupStationByRegion(regions) {

    // load departements-region in ctx
    let url = 'data/departements-region.json'
    d3.json(url).then((data) => {
        ctx.region_departement = { regions: [] }
        regions.features.forEach(r => {
            ctx.region_departement.regions.push({
                "code": r.properties.code,
                "name": r.properties.nom,
                "departements": [],
                "departement_codes": []
            })
        })
        // group stations in region by corresponding departement
        data.forEach(d => {
            ctx.region_departement.regions.forEach(r => {
                if (d.region_name == r.name) {
                    // r.departements.push({ "num": d.num_dep, "name": d.dep_name })
                    r.departements.push(d.dep_name)
                    r.departement_codes.push(String(d.num_dep))
                }
            })
        })
        // console.log("ctx.region_departement", ctx.region_departement)
    })
}

function drawDepartement(canvas, departData) {
    // console.log("departData", departData)
    canvas.selectAll("*").remove()

    let projection = d3.geoMercator()
        .center([0, 0]) // latitude & longitude
        .translate([0, 0])
        .scale(1)

    // path generator
    let path = d3.geoPath()
        .projection(projection)

    let b = path.bounds(departData)
    let s = .95 / Math.max((b[1][0] - b[0][0]) / ctx.map_w, (b[1][1] - b[0][1]) / ctx.map_h)
    let t = [(ctx.map_w - s * (b[1][0] + b[0][0])) / 2, (ctx.map_h - s * (b[1][1] + b[0][1])) / 2]
    projection
        .scale(s)
        .translate(t)

    // console.log("t", t)
    canvas.selectAll("path")
        .data([departData])
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "dimgray")
        .attr("fill", "azure")

    loadDepartStation(projection, canvas, departData.properties.code)
}
function drawRegion(canvas, regionData) {
    // load departements
    let regionName = regionData.properties.nom
    let targetDepartList = ctx.region_departement.regions.filter(r => r.name == regionName)
    // console.log("targetDepartList", targetDepartList)
    let url = 'data/departements.geojson'
    d3.json(url).then((departementData) => {

        let targetDepartements = departementData.features.filter(d => targetDepartList[0].departements.includes(d.properties.nom))
        canvas.selectAll("*").remove()

        let projection = d3.geoMercator()
            .center([0, 0]) // latitude & longitude
            .translate([0, 0])
            .scale(1)

        // path generator
        let path = d3.geoPath()
            .projection(projection)

        // recalculate boundary and re-center projection
        let b = path.bounds(regionData)
        let s = .95 / Math.max((b[1][0] - b[0][0]) / ctx.map_w, (b[1][1] - b[0][1]) / ctx.map_h)
        let t = [(ctx.map_w - s * (b[1][0] + b[0][0])) / 2, (ctx.map_h - s * (b[1][1] + b[0][1])) / 2]
        projection
            .scale(s)
            .translate(t)

        // console.log("regionData", regionData)
        // console.log("targetDepartements ", targetDepartements)
        canvas.selectAll("path")
            .data(targetDepartements)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("stroke", "dimgray")
            .attr("fill", "azure")
            .on("click", function (event, d) { drawDepartement(canvas, d) })
            .on("mouseover", function (event, d) { d3.select(this).style("fill", "#ddd333") })
            .on("mouseout", function (event, d) { d3.select(this).style("fill", "azure") })

        // console.log("targetDepartements", targetDepartements)
        canvas.selectAll("text")
            .data(targetDepartements)
            .enter()
            .append("text")
            .attr("fill", "darkslategray")
            .attr("transform", (d) => { return "translate(" + path.centroid(d) + ")" })
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .text((d) => {
                return d.properties.nom
            })

        // append the name
        canvas.append("text")
            .attr("x", 0)
            .attr("y", 340)
            .attr("font-size", 90)
            .attr("font-weight", "bold")
            .attr("font-family", "Times New Roman")
            .attr("text-anchor", "middle")
            .attr("opacity", 0.5)

        loadRegionStation(projection, canvas, targetDepartList)
    })


}

function loadStation(projection, canvas) {
    d3.json(ctx.stationDataPath).then((data) => {
        // data.features.forEach(d => {
        //     console.log(d.properties["gare_alias_libelle_noncontraint"])
        // })

        canvas.selectAll("circle")
            .data(data.features.filter(d => d.geometry !== null && d.geometry.type === "Point"))
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 0)
            // .on("mouseover", function (event, d) {
            //     d3.select("#stationName").html(d.properties["gare_alias_libelle_noncontraint"])
            // })
            // animation
            .transition()
            .ease(d3.easeLinear)
            .duration(1000)
            .delay(900)
            .attr("r", 1)
            .attr("fill", "DarkSlateGray")
    })
}

function loadDepartStation(projection, canvas, departCode) {
    d3.json(ctx.stationDataPath).then((data) => {
        data = data.features.filter(d => d.geometry !== null && d.geometry.type === "Point" && d.properties.departement_numero == departCode)

        let tooltip = d3.select("#main")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "Ivory")
            .style("border", "solid 2px DimGray")
            .style("border-radius", "5px")
            .style("padding", "5px")
            .style("position", "absolute")
            .style("color", "#333")

        canvas.selectAll("circle")
            .data(data)
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 0)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "red")
                tooltip.style("opacity", 1)
            })
            .on("mousemove", function (event, d) {
                // console.log(d.properties["gare_alias_libelle_noncontraint"])
                tooltip
                    .html(d.properties["gare_alias_libelle_noncontraint"])
                    .style("left", event.x + 10 + "px")
                    .style("top", event.y + "px")
            })
            .on("mouseout", function (event) {
                d3.select(this).attr("fill", "DarkSlateGray")
                tooltip.style("opacity", 0)
            })
            // animation
            .transition()
            .ease(d3.easeLinear)
            .duration(600)
            .delay(600)
            .attr("r", 3)
            .attr("fill", "DarkSlateGray")

        // console.log("station data", data)
        // canvas.selectAll("text")
        //     .data(data)
        //     .enter()
        //     .append("text")
        //     .attr("fill", "darkslategray")
        //     .attr("transform", (d) => { return `translate(${projection(d.geometry.coordinates)[0]}, ${projection(d.geometry.coordinates)[1] - 10})` })
        //     .attr("text-anchor", "middle")
        //     .attr("dy", ".35em")
        //     .text((d) => {
        //         return d.properties["gare_alias_libelle_noncontraint"]
        //     })

        // // append the name
        // canvas.append("text")
        //     .attr("x", 0)
        //     .attr("y", 340)
        //     .attr("font-size", 90)
        //     .attr("font-weight", "bold")
        //     .attr("font-family", "Times New Roman")
        //     .attr("text-anchor", "middle")
        //     .attr("opacity", 0.5)
    })
}

function loadRegionStation(projection, canvas, list) {
    d3.json(ctx.stationDataPath).then((data) => {

        let tooltip = d3.select("#main")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "Ivory")
            .style("border", "solid 2px DimGray")
            .style("border-radius", "5px")
            .style("padding", "5px")
            .style("position", "absolute")
            .style("color", "#333")

        canvas.selectAll("circle")
            .data(data.features.filter(d => d.geometry !== null && d.geometry.type === "Point" && list[0].departement_codes.includes(d.properties.departement_numero)))
            .join("circle")
            .attr("cx", d => projection(d.geometry.coordinates)[0])
            .attr("cy", d => projection(d.geometry.coordinates)[1])
            .attr("r", 0)
            .on("mouseover", function (event, d) {
                // ").html(d.properties["gare_alias_libelle_noncontraint"])
                d3.select(this).attr("fill", "red")
                tooltip.style("opacity", 1)
            })
            .on("mousemove", function (event, d) {
                tooltip
                    .html(d.properties["gare_alias_libelle_noncontraint"])
                    // .attr("transform", `translate(${event.x}, ${event.y})`)
                    .style("left", event.x + 10 + "px")
                    .style("top", event.y + "px")
            })
            .on("mouseleave", function (event) {
                d3.select(this).attr("fill", "DarkSlateGray")
                tooltip.style("opacity", 0)
            })
            // animation
            .transition()
            .ease(d3.easeLinear)
            .duration(1000)
            .delay(800)
            .attr("r", 2.5)
            .attr("fill", "DarkSlateGray")

    })
}