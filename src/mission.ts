import * as t from './common';


interface Mission {
  deadline: number; // turn number
}

interface Delivery extends Mission {
  cargo_units: number; // number of whole cargo units taken for deliverable
  destination: t.body;
}

interface Passengers extends Delivery {
  cargo_units: 1;
}


interface CompletionCondition {
}
