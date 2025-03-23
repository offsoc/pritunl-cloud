package nodeport

import (
	"github.com/pritunl/mongo-go-driver/bson/primitive"
	"github.com/pritunl/pritunl-cloud/database"
	"github.com/pritunl/pritunl-cloud/errortypes"
)

type NodePort struct {
	Id         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Datacenter primitive.ObjectID `bson:"datacenter" json:"datacenter"`
	Protocol   string             `bson:"protocol" json:"protocol"`
	Port       int                `bson:"port" json:"port"`
	Resource   primitive.ObjectID `bson:"resource" json:"resource"`
}

func (n *NodePort) Validate(db *database.Database) (
	errData *errortypes.ErrorData, err error) {

	switch n.Protocol {
	case Tcp, Udp:
		break
	default:
		errData = &errortypes.ErrorData{
			Error:   "invalid_protocol",
			Message: "Invalid node port protocol",
		}
		return
	}

	return
}

func (n *NodePort) Insert(db *database.Database) (err error) {
	coll := db.NodePorts()

	_, err = coll.InsertOne(db, n)
	if err != nil {
		err = database.ParseError(err)
		return
	}

	return
}

type Mapping struct {
	NodePort     primitive.ObjectID `bson:"node_port" json:"node_port"`
	Protocol     string             `bson:"protocol" json:"protocol"`
	ExternalPort int                `bson:"external_port" json:"external_port"`
	InternalPort int                `bson:"internal_port" json:"internal_port"`
	Delete       bool               `bson:"-" json:"internal_port"`
}

func (m *Mapping) Diff(mapping *Mapping) bool {
	if m.Protocol != mapping.Protocol {
		return true
	}

	if m.ExternalPort != mapping.ExternalPort {
		return true
	}

	if m.InternalPort != mapping.InternalPort {
		return true
	}

	return false
}
