package WR::App::Controller::Player;
use Mojo::Base 'WR::App::Controller';
use WR::Query;
use Tie::IxHash;
use boolean;

sub index {
    my $self = shift;
    my $p    = $self->req->param('player');
    my $results = [];
    my $temp = {};

    if(defined($p)) {
        my $query = {
            '$or' => [
                { 'player.name' => qr/^$p/i },
                { 'vehicles.name' => qr/^$p/i },
            ]
        };

        my $cursor = $self->model('wot-replays.replays')->find($query);
        while(my $replay = $cursor->next()) {
            $temp->{$replay->{player}->{server}}->{$replay->{player}->{name}}++ if($replay->{player}->{name} =~ qr/^$p/i);
            foreach my $v (values(%{$replay->{vehicles}})) {
                $temp->{$replay->{player}->{server}}->{$v->{name}}++ if($v->{name} =~ qr/^$p/i);
            }
        }
    }

    foreach my $server (keys(%$temp)) {
        foreach my $player (keys(%{$temp->{$server}})) {
            push(@$results, { player => $player, server => $server });
        }
    }

    $self->respond(
        template => 'player/index',
        stash => {
            page    => { title => 'Players' },
            player  => $p,
            results => $results,
        },
    );
}

sub get_quick_stats {
    my $self = shift;
    my $server = shift;
    my $player = shift;

    my $cmd = Tie::IxHash->new(
        group => {
            ns => 'replays',
            initial => { 
                kills => 0, 
                damages => 0, 
                spots => 0, 
                c => 0, 
                damagedone => 0,
                vehicles => {},
                maps => {},
                },
            key => { 'player.name' => 1 },
            cond => {
                'player.name'   => $player,
                'player.server' => $server,
                'site.visible'  => true,
                'complete'      => true,
            },
            '$reduce' => q|function(obj, prev) { prev.kills += obj.statistics.kills; prev.damages += obj.statistics.damaged; prev.spots += obj.statistics.spotted; prev.c += 1; prev.damagedone += obj.statistics.damageDealt; if(!prev.vehicles[obj.player.vehicle.full]) { prev.vehicles[obj.player.vehicle.full] = 1 } else { prev.vehicles[obj.player.vehicle.full] += 1; } if(!prev.maps[obj.map.id]) { prev.maps[obj.map.id] = 1 } else {  prev.maps[obj.map.id] += 1 } }|,
            finalize => q|function(out) { out.damagedone_a = (out.damagedone > 0 && out.c > 0) ? out.damagedone/out.c : 0; out.kills_a = (out.kills > 0 && out.c > 0) ?out.kills / out.c : 0; out.damages_a = (out.damages > 0 && out.c > 0) ? out.damages / out.c : 0; out.spots_a = (out.spots > 0 && out.c > 0) ? out.spots / out.c : 0; return out; }|
        }
    );

    my $res = $self->db('wot-replays')->run_command($cmd);
    return $res->{retval}->[0] || {};
}

sub ambi {
    my $self = shift;
    my $player = $self->stash('player_name');

    # this might take a while...
    my $mapf = 'function() { emit(this.player.server, 1); }';
    my $redf = 'function(keys, values) { var sum = 0; values.forEach(function(v) { sum += v }); return sum; }';

    my $cmd = Tie::IxHash->new(
        "mapreduce" => "replays",
        map => $mapf,
        reduce => $redf,
        query => { 'player.name' => $player },
        out => { inline => 1 }
    );
    my $res = $self->db('wot-replays')->run_command($cmd);
    my $servers = [];
    if($res->{ok} == 1) {
        foreach my $r (@{$res->{results}}) {
            push(@$servers, $r->{_id});
        }
    } else {
        $servers = [];
    }
    if(scalar(@$servers) == 1) {
        $self->redirect_to(sprintf('/player/%s/%s', $servers->[0], $player));
    } else {
        $self->respond(stash => {
            page => { title => 'Finding Player' },
            servers => $servers,
            template => 'player/ambi',
        });
    }
}

sub involved {
    return shift->view(1);
}

sub view { 
    my $self = shift;
    my $inv  = shift;
    my $server = $self->stash('server');
    my $player = $self->stash('player_name');

    $self->respond(
        template => ($inv) ? 'player/involved' : 'player/view',
        stash    => {
            total_replays => $self->db('wot-replays')->get_collection('replays')->find({ 
                'player.name' => $player, 
                'player.server' => $server, 
                'site.visible' => true 
                })->count(),
            total_involved => $self->db('wot-replays')->get_collection('replays')->find({ 
                'player.server' => $server, 
                'vehicles.name' => $player,
                'player.name' => { '$ne' => $player },
                'site.visible' => true 
                })->count(),
            statistics => $self->get_quick_stats($server => $player),
            page => {
                title => sprintf('Players &raquo; %s', $player),
            },
        }
    );
}

1;
