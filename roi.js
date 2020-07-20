
function init(data) {
    document.getElementById('ftes').value = data.employees || 10;
    document.getElementById('cost').value = data.cost_per_employee || 60;
    document.getElementById('alloc').value = data.percent_of_time || 50;
    document.getElementById('size').value = data.total_headcount || 200;
    
}

init(data);

const xLabel = 'Year';
const yLabel = 'Deck Making Expenses ($000s)';


let margin = {
    top:    100,
    right:  25, 
    bottom: 100, // leave space for x-axis
    left:   200  // leave space for y-axis
};

const viewboxHeight = 900;
const viewBoxWidth = 1600;

const bounds = "0 0 " + viewBoxWidth + " " + viewboxHeight;

var svg = d3.select("#chart")
    .append("svg")
    // Responsive SVG needs these 2 attributes and no width and height attr.
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", bounds)
    // Class to make it responsive.
    .classed("svg-content-responsive", true);

var years = ['Year 1', 'Year 2', 'Year 3'];



function makeYearMap(arr) {
    return arr.reduce( function(tot, cur, i) {
        tot.push({
            key: years[i],
            value: cur
        })
        return tot;
    },[]);
}

function runModel() {
    var ftes = parseFloat(document.getElementById('ftes').value);
    var costPerhead =parseFloat(document.getElementById('cost').value);
    var allocatedTime = parseFloat(document.getElementById('alloc').value);
    var companySize = parseFloat(document.getElementById('size').value);
    var plan = document.querySelector('input[name=plan-type]:checked').value;

    if (isNaN(ftes + costPerhead + allocatedTime + companySize)) {
        return false;
    }

    var costPerUser = {
        basic: 10,
        pro: 35,
        enterprise: 100
    } // not real pricing

    var costBaseline = ftes * costPerhead * allocatedTime / 100;

    var units = "$000s"
    var divisor = 1;

    var licenseCost = companySize * 0.5 * costPerUser[plan] * 12 / 1000;  // assume 50% of users need seatsu
    
    if (plan == "enterprise") {
        var userCost = Math.max(((50 - 100) / (10000 - 200)) * (companySize - 200) + 100, 35);  // Just made upa pricing formulat
        licenseCost = companySize * 0.5 * userCost * 12 / 1000;  // assume 50% of users need seatsu

    }   
    if (costBaseline > 1000 || licenseCost > 1000) {
        units = "$M";
        divisor = 1000
        costBaseline = costBaseline / divisor;
        licenseCost = licenseCost / divisor;
    }

    var year1 = (licenseCost + (Math.max(costBaseline - licenseCost, 0) / 2));  // assume half savings in 1st

    var annualBaseline = [costBaseline, costBaseline, costBaseline];

    var expenses = [year1, licenseCost, licenseCost];


    annualSavings = annualBaseline.map( (num , idx) => num - expenses[idx]);

    totalSavings = annualSavings.reduce( (total, cur) => total + cur );

    var data = {
        baseline: makeYearMap(annualBaseline),
        expenses: makeYearMap(expenses),
        annualSavings: makeYearMap(annualSavings),
        totalSavings: Math.round(totalSavings, 2),
        units: units
    }


    return data;
    
    
}


function updateChart() {
    var data = runModel();

    // let bounds = svg.node().getBoundingClientRect();

    if (data) {

          let plotWidth = viewBoxWidth - margin.right - margin.left;
        let plotHeight = viewboxHeight - margin.top - margin.bottom;

        var range = data.baseline.map(x => x.value).concat(data.expenses.map(x => x.value));

        var yMax = range.reduce( (a, b) => Math.max(a,b));

        var yScale = d3.scaleLinear()
            .domain([0, yMax])
            .range([plotHeight, 0])
            .nice();

        var xScale = d3.scaleBand()
            .domain(years)
            .rangeRound([0,plotWidth])
            .paddingInner(0.1)

        var plot = svg.select("g#plot");

        if (plot.size() < 1) {
            // this is the first time we called this function
            // we need to steup the plot area
            plot = svg.append("g").attr("id", "plot");
        
            // notice in the "elements" view we now have a g element!
        
            // shift the plot area over by our margins to leave room
            // for the x- and y-axis
            plot.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        }



        var xAxis = d3.axisBottom(xScale);
        var yAxis = d3.axisLeft(yScale);

        if (plot.select("g#y-axis").size() < 1) {
            let xGroup = plot.append("g")
                .attr("id", "x-axis")
                .attr("class", "axis");
        
            // the drawing is triggered by call()
            xGroup.call(xAxis);
        
            // notice it is at the top of our svg
            // we need to translate/shift it down to the bottom
            xGroup.attr("transform", "translate(0," + plotHeight + ")");
        
            // do the same for our y axix
            let yGroup = plot.append("g")
                .attr("id", "y-axis")
                .attr("class", "axis");
            
            yGroup.call(yAxis);
            // yGroup.attr("transform", "translate(" + plotWidth + ",0)");
        } else {
            plot.select("g#y-axis").call(yAxis);
        }
        var barContainer = plot.select('g#barContainer');
        
        if (!barContainer.node()) {
            barContainer = plot.append("g").attr('id', 'barContainer');
        }

        var bars = barContainer.selectAll("rect")
            .data(data.expenses, function(d) { 
                return d; 
            });

        bars.enter().append("rect")
            // we will style using css
            .attr("class", "bar")
            // the width of our bar is determined by our band scale
            .attr("width", xScale.bandwidth())
            // we must now map our letter to an x pixel position
            .attr("x", function(d) {
                return xScale(d.key);
            })
            // and do something similar for our y pixel position
            .attr("y", function(d) {
                return yScale(d.value);
            })
            // here it gets weird again, how do we set the bar height?
            .attr("height", function(d) {
                return plotHeight - yScale(d.value);
            });

        bars.transition()
            .attr("y", function(d) { return yScale(d.value); })
            .attr("height", function(d) { return plotHeight - yScale(d.value); });

        bars.exit()
            .transition()
            .attr("y", function(d) { return yScale(0); })
            .attr("height", function(d) { return plotHeight - yScale(0); })
            .remove();

        var lineContainer = plot.select('g#lineContainer');
        
        if (!lineContainer.node()) {
            lineContainer = plot.append("g").attr('id', 'lineContainer');
        }

        var line = d3.line()
            .x( (d, i) => xScale(d.key) + xScale.bandwidth() / 2 ) // set the x values for the line generator
            .y((d) => yScale(d.value) ) // set the y values for the line generator 

        var lines = lineContainer.selectAll(".line")
                .data([data.baseline])
            
        lines.enter()
            .append("path")
            .attr('class', 'line')
            .attr("d", line );
        
        lines.transition()
            .attr("d", line);

        lines.exit()
            .transition()
            .remove();

        var legend = svg.select('g#legend');

        if (!legend.node()) {
            legend = svg.append("g")
            .attr('id', 'legend')
            .attr("class", "legend")
            .attr('transform', "translate(0,0)");
        
            legend.append("rect")
                .attr("width", 40)
                .attr("height", 30)
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", 0);

            legend.append("text")
                .attr("x", 50)
                .attr("y", 30)
                .attr("class", "legend-text")
                .text("Cost With Presalytics");

            legend.append("path")
                .attr("d", "M0 15 L40 15")
                .attr("class", "line")
                .attr("transform", "translate(500)");

            legend.append("text")
                .attr("x", 550)
                .attr("y", 30)
                .attr("class", "legend-text")
                .text("Current Deckmaking Cost");
        }

        var legendWidth = legend.node().getBBox().width;
        var legendTranslate = (viewBoxWidth - legendWidth) / 2 + margin.left - margin.right;

        legend.attr('transform', "translate(" + legendTranslate + ")");

        var xLabel = svg.select('text#y-label');

        if (!xLabel.node()) {
            xLabel = svg.append("text")
                .attr('id', 'y-label')
                .attr("x", margin.left)
                .attr("y", 30)
                .style("text-anchor", "middle")
                .attr("class", "label-text");
        }

        xLabel.text(data.units);

        var yLabel = svg.select('text#x-label');

        if (!yLabel.node()) {
            svg.append("text")
                .attr('id', 'x-label')
                .attr("x", plotWidth / 2 + margin.left)
                .attr("y", viewboxHeight)
                .style("text-anchor", "middle")
                .attr("class", "label-text")
                .text("Annual Cost Estimate");
        }    

        lineContainer.raise();

        var savings = "$ " + data.totalSavings.toString();
        if (data.units === "$M") {
            savings += "M"
        } else {
            if (data.totalSavings > 1000) {
                mod = Math.Round(data.totalSavings / 1000, 2);
                savings = "$ " + mod.toString() + "M";
            } else {
                savings += ",000"
            }
        }

        var klass = "danger";
        if (data.totalSavings > 0) {
            klass = "success"
        }

        d3.select('span#savings')
            .text(savings)
            .attr('class', klass);
    }
}


document.addEventListener("DOMContentLoaded", function(event) { 
    setTimeout(updateChart, 500);
});

window.updateChart = updateChart;

