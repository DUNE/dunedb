

function randomGaussian(mean,sigma) {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    var norm =  Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return (norm*sigma)+mean;
}


function pickRandom(arr)
{
  var i = Math.floor(Math.random() * arr.length);
  return arr[i];
}

    var tensions = [];
    var xs = [];
    for(var i=0;i<10;i++) {
        var x = randomGaussian(i*2,0);
        xs.push(x.toFixed(1));
        tensions.push(randomGaussian(10+2*x,10).toFixed(1));
    }

// console.log(JSON.stringify(tensions));
console.log(xs.join('\n'));
console.log(tensions.join('\n'));
